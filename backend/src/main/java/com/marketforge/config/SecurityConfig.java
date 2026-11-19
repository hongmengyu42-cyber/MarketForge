package com.marketforge.config;

import com.marketforge.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    // FIX #2: CORS origins are now driven by ALLOWED_ORIGINS env var, not wildcarded.
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOriginsRaw;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(request -> {
                List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList();
                CorsConfiguration corsConfig = new CorsConfiguration();
                if (origins.contains("*")) {
                    corsConfig.addAllowedOriginPattern("*");
                } else {
                    corsConfig.setAllowedOrigins(origins);
                }
                corsConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                corsConfig.setAllowedHeaders(List.of("*"));
                corsConfig.setAllowCredentials(true);
                corsConfig.setMaxAge(3600L);
                return corsConfig;
            }))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/google",
                    "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
                    "/api/v1/auth/resend-verification").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/verify-email").permitAll()
                .requestMatchers("/ws/**", "/ws", "/ws-raw/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/jobs/my/**", "/api/v1/jobs/*/proposals").authenticated()
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/listings", "/api/v1/listings/**",
                    "/api/v1/categories", "/api/v1/skills",
                    "/api/v1/sellers/**", "/api/v1/seller/*", "/api/v1/search/**",
                    "/api/v1/jobs", "/api/v1/jobs/*",
                    "/api/v1/portfolio/users/**",
                    "/api/v1/assessments", "/api/v1/assessments/*", "/api/v1/assessments/badges/user/**"
                ).permitAll()
                // Stripe webhooks — public (Stripe signs with webhook secret instead of JWT)
                .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/stripe").permitAll()
                // Swagger / OpenAPI
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/swagger-ui/index.html",
                    "/api-docs",
                    "/api-docs/**",
                    "/v3/api-docs",
                    "/v3/api-docs/**",
                    "/swagger-resources",
                    "/swagger-resources/**",
                    "/webjars/**"
                ).permitAll()
                // FIX #3: Actuator is now ADMIN-only (was: .permitAll())
                .requestMatchers("/actuator", "/actuator/**").hasRole("ADMIN")
                // Static files
                .requestMatchers("/uploads/**").permitAll()
                // Admin-only API
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
