package com.marketforge.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * In-memory token bucket rate limiter powered by Bucket4j.
 * Protects auth, payments, and general API endpoints from brute force and denial of service.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> paymentBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    private static final int MAX_CACHE_ENTRIES = 20_000;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Bypass CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String uri = request.getRequestURI();

        // 2. Bypass static assets, Swagger, Actuator, and Webhooks
        if (shouldBypass(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Determine client IP
        String clientIp = getClientIp(request);

        // 4. Resolve the appropriate bucket
        Bucket bucket = resolveBucket(uri, clientIp);

        if (bucket == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // 5. Try consuming 1 token
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            long waitSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.warn("Rate limit exceeded for IP: {} on URI: {}. Wait: {}s", clientIp, uri, waitSeconds);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(waitSeconds));
            response.setHeader("X-RateLimit-Remaining", "0");

            String body = String.format(
                "{\"success\":false,\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"Too many requests. Please try again in %d seconds.\"}",
                waitSeconds
            );
            response.getWriter().write(body);
        }
    }

    private boolean shouldBypass(String uri) {
        return uri.startsWith("/swagger-ui") ||
               uri.startsWith("/v3/api-docs") ||
               uri.startsWith("/api-docs") ||
               uri.startsWith("/actuator") ||
               uri.startsWith("/uploads/") ||
               uri.startsWith("/ws") ||
               uri.startsWith("/api/v1/webhooks/stripe");
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private Bucket resolveBucket(String uri, String clientIp) {
        evictIfOversized();

        // Auth endpoints (strictly limited: 10 requests / min per IP)
        if (uri.startsWith("/api/v1/auth/")) {
            return authBuckets.computeIfAbsent(clientIp, k -> createBucket(10, Duration.ofMinutes(1)));
        }

        // Payment endpoints (20 requests / min per IP)
        if (uri.startsWith("/api/v1/payments/")) {
            return paymentBuckets.computeIfAbsent(clientIp, k -> createBucket(20, Duration.ofMinutes(1)));
        }

        // General API (120 requests / min per IP)
        if (uri.startsWith("/api/v1/")) {
            return generalBuckets.computeIfAbsent(clientIp, k -> createBucket(120, Duration.ofMinutes(1)));
        }

        return null;
    }

    private Bucket createBucket(long capacity, Duration refillDuration) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, refillDuration)
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private void evictIfOversized() {
        if (authBuckets.size() > MAX_CACHE_ENTRIES) authBuckets.clear();
        if (paymentBuckets.size() > MAX_CACHE_ENTRIES) paymentBuckets.clear();
        if (generalBuckets.size() > MAX_CACHE_ENTRIES) generalBuckets.clear();
    }
}
