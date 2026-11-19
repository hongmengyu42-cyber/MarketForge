package com.marketforge.service;

import com.marketforge.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Service
@Slf4j
public class GoogleAuthService {

    @Value("${google.client-id:}")
    private String configuredClientId;

    private final RestClient restClient = RestClient.create();

    public record GoogleUserInfo(
            String googleId,
            String email,
            String name,
            String picture,
            boolean emailVerified
    ) {}

    /**
     * Verifies a Google ID token against Google's tokeninfo endpoint and extracts profile.
     */
    public GoogleUserInfo verifyGoogleIdToken(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new BusinessException("EMPTY_TOKEN", "Google ID token must not be empty");
        }

        try {
            String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            Map<String, Object> claims = restClient.get()
                    .uri(verifyUrl)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (claims == null || claims.containsKey("error")) {
                String error = claims != null ? (String) claims.get("error_description") : "Invalid token";
                throw new BusinessException("INVALID_GOOGLE_TOKEN", "Google token verification failed: " + error);
            }

            // Verify audience if configured
            if (StringUtils.hasText(configuredClientId)) {
                String aud = (String) claims.get("aud");
                if (!configuredClientId.equals(aud)) {
                    log.warn("Google token audience mismatch. Expected: {}, received: {}", configuredClientId, aud);
                    throw new BusinessException("TOKEN_AUDIENCE_MISMATCH", "Token was not issued for this application");
                }
            }

            String googleId = (String) claims.get("sub");
            String email = (String) claims.get("email");
            String name = (String) claims.get("name");
            String picture = (String) claims.get("picture");
            Object emailVerifiedObj = claims.get("email_verified");

            boolean emailVerified = Boolean.TRUE.equals(emailVerifiedObj) || "true".equalsIgnoreCase(String.valueOf(emailVerifiedObj));

            if (!StringUtils.hasText(email)) {
                throw new BusinessException("MISSING_EMAIL", "Google account does not have an associated email address");
            }

            return new GoogleUserInfo(googleId, email, name, picture, emailVerified);
        } catch (RestClientResponseException e) {
            log.error("Google token verification HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException("INVALID_GOOGLE_TOKEN", "Google authentication failed: Token is invalid or expired");
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Unexpected error during Google token verification", e);
            throw new BusinessException("GOOGLE_AUTH_ERROR", "Failed to verify Google account: " + e.getMessage());
        }
    }
}
