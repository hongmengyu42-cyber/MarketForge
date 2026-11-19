package com.marketforge.config;

import com.marketforge.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS fallback endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Direct WebSocket endpoint
        registry.addEndpoint("/ws-raw")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = extractToken(accessor);

                    if (token != null && !token.isBlank()) {
                        try {
                            String email = jwtTokenProvider.extractUsername(token);
                            if (email != null) {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                if (jwtTokenProvider.isTokenValid(token, userDetails)) {
                                    UsernamePasswordAuthenticationToken authentication =
                                            new UsernamePasswordAuthenticationToken(
                                                    userDetails,
                                                    null,
                                                    userDetails.getAuthorities()
                                            );
                                    accessor.setUser(authentication);
                                    log.info("WebSocket authenticated: {}", email);
                                } else {
                                    // FIX #8: Reject the frame — token is invalid/expired
                                    log.warn("WebSocket CONNECT rejected: token invalid or expired for {}", email);
                                    throw new org.springframework.security.access.AccessDeniedException(
                                            "WebSocket token is invalid or expired");
                                }
                            }
                        } catch (org.springframework.security.access.AccessDeniedException ade) {
                            throw ade;
                        } catch (Exception e) {
                            // FIX #8: Reject the frame on any JWT parse error
                            log.warn("WebSocket CONNECT rejected: JWT error — {}", e.getMessage());
                            throw new org.springframework.security.access.AccessDeniedException(
                                    "WebSocket authentication failed: " + e.getMessage());
                        }
                    } else {
                        // FIX #8: No token provided — reject unauthenticated CONNECT frames.
                        // Previously the CONNECT was silently allowed and the user remained anonymous,
                        // enabling read access to any /topic subscription without authentication.
                        log.warn("WebSocket CONNECT rejected: no JWT token provided");
                        throw new org.springframework.security.access.AccessDeniedException(
                                "WebSocket connection requires a valid JWT token");
                    }
                }

                return message;
            }

            private String extractToken(StompHeaderAccessor accessor) {
                // 1. Authorization: Bearer <token>
                List<String> authHeaders = accessor.getNativeHeader("Authorization");
                if (authHeaders != null && !authHeaders.isEmpty()) {
                    String header = authHeaders.get(0);
                    if (header != null && header.startsWith("Bearer ")) {
                        return header.substring(7);
                    }
                    if (header != null && !header.isBlank()) {
                        return header;
                    }
                }
                // 2. token: <token> (fallback for some SockJS clients)
                List<String> tokenHeaders = accessor.getNativeHeader("token");
                if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
                    return tokenHeaders.get(0);
                }
                return null;
            }
        });
    }
}
