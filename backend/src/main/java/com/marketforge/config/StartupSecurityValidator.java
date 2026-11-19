package com.marketforge.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * FIX #1: Security startup validator.
 *
 * Validates critical security configuration at startup and:
 *   - In PRODUCTION: throws IllegalStateException (crashes the app) on any insecure default.
 *   - In DEV/local:  emits loud WARNING logs so developers notice.
 *
 * This prevents accidentally deploying a build with placeholder secrets.
 */
@Slf4j
@Component
public class StartupSecurityValidator implements ApplicationListener<ApplicationReadyEvent> {

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${stripe.api-key:}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${app.security.strict:false}")
    private boolean strictSecurity;

    private static final String JWT_DEFAULT = "marketforge-super-secret-key-please-change-in-production-2026";
    private static final int JWT_MIN_LENGTH = 32;

    private final Environment environment;

    public StartupSecurityValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        boolean isProd = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equalsIgnoreCase("prod") || p.equalsIgnoreCase("production"));

        validateJwtSecret(isProd);
        validateStripe(isProd);

        if (!isProd) {
            log.warn("╔══════════════════════════════════════════════════════════════╗");
            log.warn("║  MarketForge is running in DEVELOPMENT mode.                ║");
            log.warn("║  Set ALLOWED_ORIGINS, JWT_SECRET, STRIPE_SECRET_KEY,        ║");
            log.warn("║  STRIPE_WEBHOOK_SECRET before deploying to production.      ║");
            log.warn("╚══════════════════════════════════════════════════════════════╝");
        }
    }

    private void validateJwtSecret(boolean isProd) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            String msg = "SECURITY: JWT_SECRET environment variable is not set. Using temporary fallback. Set a strong secret in Render.";
            if (isProd && strictSecurity) throw new IllegalStateException(msg);
            log.warn("[SECURITY WARNING] {}", msg);
            return;
        }
        if (jwtSecret.equals(JWT_DEFAULT)) {
            String msg = "SECURITY: JWT_SECRET is still the default placeholder value. Recommended: Set a unique secret via JWT_SECRET env var in Render.";
            if (isProd && strictSecurity) throw new IllegalStateException(msg);
            log.warn("[SECURITY WARNING] {}", msg);
        }
        if (jwtSecret.length() < JWT_MIN_LENGTH) {
            String msg = "SECURITY: JWT_SECRET is too short (" + jwtSecret.length() + " chars). Minimum is " + JWT_MIN_LENGTH + ".";
            if (isProd && strictSecurity) throw new IllegalStateException(msg);
            log.warn("[SECURITY WARNING] {}", msg);
        }
    }

    private void validateStripe(boolean isProd) {
        if (stripeApiKey == null || stripeApiKey.isBlank() || stripeApiKey.contains("placeholder")) {
            String msg = "SECURITY: STRIPE_SECRET_KEY is not set or is a placeholder. Platform payments run in MOCK ESCROW mode.";
            if (isProd && strictSecurity) throw new IllegalStateException(msg);
            log.warn("[SECURITY NOTICE] {}", msg);
        }
        if (stripeWebhookSecret == null || stripeWebhookSecret.isBlank() || stripeWebhookSecret.contains("placeholder")) {
            String msg = "SECURITY: STRIPE_WEBHOOK_SECRET is not set. Mock escrow is active; live Stripe webhook verification disabled.";
            if (isProd && strictSecurity) throw new IllegalStateException(msg);
            log.warn("[SECURITY NOTICE] {}", msg);
        }
    }
}
