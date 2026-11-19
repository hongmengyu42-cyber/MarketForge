package com.marketforge.service;

import com.marketforge.dto.request.*;
import com.marketforge.dto.request.ForgotPasswordRequest;
import com.marketforge.dto.request.ResetPasswordRequest;
import com.marketforge.dto.response.AuthResponse;
import com.marketforge.dto.response.UserResponse;
import com.marketforge.entity.BuyerProfile;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.repository.BuyerProfileRepository;
import com.marketforge.repository.UserRepository;
import com.marketforge.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BuyerProfileRepository buyerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final GoogleAuthService googleAuthService;
    private final EmailService emailService;

    /**
     * Register a new user. Creates both the user and a default buyer profile.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new BusinessException("EMAIL_TAKEN", "An account with this email already exists");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .isAdmin(false)
                .riskScore(0)
                .isFlaggedForReview(false)
                .build();

        // Generate email verification token
        String verificationToken = UUID.randomUUID().toString();
        user.setEmailVerificationToken(verificationToken);
        user = userRepository.save(user);

        // Send verification email (async, non-blocking)
        emailService.sendEmailVerification(user, verificationToken);

        // Auto-create buyer profile
        BuyerProfile buyerProfile = BuyerProfile.builder()
                .user(user)
                .build();
        buyerProfileRepository.save(buyerProfile);

        String token = jwtTokenProvider.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .message("Account created successfully")
                .build();
    }

    /**
     * Authenticate a user and return a JWT token.
     */
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new BusinessException("User not found"));

        // Email verification enforcement: block login until email is confirmed
        if (user.getEmailVerifiedAt() == null) {
            throw new BusinessException("EMAIL_NOT_VERIFIED",
                "Please verify your email address before logging in. " +
                "Check your inbox for the verification link.");
        }

        String token = jwtTokenProvider.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .message("Login successful")
                .build();
    }

    /**
     * Authenticate or register a user via Google OAuth2 / Identity Services.
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleAuthService.GoogleUserInfo googleUser;

        // FIX #4: Always verify the Google idToken against Google's tokeninfo endpoint.
        // The "demo_" bypass allowed unauthenticated logins by supplying any email — removed.
        if (!StringUtils.hasText(request.getIdToken())) {
            throw new BusinessException("INVALID_REQUEST", "A valid Google ID token is required");
        }
        googleUser = googleAuthService.verifyGoogleIdToken(request.getIdToken());

        String email = googleUser.email().trim().toLowerCase();

        // Check if user already exists
        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            // Update Google link and details if not set
            if (user.getGoogleId() == null && googleUser.googleId() != null) {
                user.setGoogleId(googleUser.googleId());
            }
            if (user.getAvatarUrl() == null && googleUser.picture() != null) {
                user.setAvatarUrl(googleUser.picture());
            }
            if (user.getEmailVerifiedAt() == null && googleUser.emailVerified()) {
                user.setEmailVerifiedAt(LocalDateTime.now());
            }
            userRepository.save(user);
            log.info("User logged in via Google: id={}, email={}", user.getId(), user.getEmail());
        } else {
            // Register new user via Google
            user = User.builder()
                    .name(StringUtils.hasText(googleUser.name()) ? googleUser.name() : email.split("@")[0])
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .avatarUrl(googleUser.picture())
                    .googleId(googleUser.googleId())
                    .authProvider("GOOGLE")
                    .emailVerifiedAt(googleUser.emailVerified() ? LocalDateTime.now() : null)
                    .isAdmin(false)
                    .riskScore(0)
                    .isFlaggedForReview(false)
                    .build();

            BuyerProfile buyerProfile = BuyerProfile.builder()
                    .user(user)
                    .build();
            user.setBuyerProfile(buyerProfile);

            userRepository.save(user);
            log.info("Registered new user via Google Sign-In: id={}, email={}", user.getId(), user.getEmail());
        }

        String token = jwtTokenProvider.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .message("Google login successful")
                .build();
    }

    /**
     * Get the currently authenticated user profile.
     */
    @Transactional(readOnly = true)
    public UserResponse me(User currentUser) {
        // Re-fetch with relationships loaded
        User user = userRepository.findByIdWithProfiles(currentUser.getId())
                .orElse(currentUser);
        return UserResponse.from(user);
    }

    /**
     * Update profile info (name, phone, bio, etc.)
     */
    @Transactional
    public UserResponse updateProfile(User currentUser, UpdateProfileRequest request) {
        User user = userRepository.findByIdWithProfiles(currentUser.getId())
                .orElse(currentUser);
        if (request.getName() != null) {
            user.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAvatarUrl() != null) {
            String trimmed = request.getAvatarUrl().trim();
            user.setAvatarUrl(trimmed.isEmpty() ? null : trimmed);
        }

        // Update seller profile if it exists and seller fields are provided
        if (user.getSellerProfile() != null) {
            var sp = user.getSellerProfile();
            if (request.getDisplayName() != null) sp.setDisplayName(request.getDisplayName().trim());
            if (request.getBio() != null) sp.setBio(request.getBio().trim());
            if (request.getAvatarUrl() != null) {
                String trimmed = request.getAvatarUrl().trim();
                sp.setAvatarUrl(trimmed.isEmpty() ? null : trimmed);
            }
            if (request.getHourlyRate() != null) sp.setHourlyRate(request.getHourlyRate() * 100); // dollars→cents
        }

        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * Direct update for user avatar URL (used by upload and quick selector).
     */
    @Transactional
    public UserResponse updateAvatar(User currentUser, String avatarUrl) {
        User user = userRepository.findByIdWithProfiles(currentUser.getId())
                .orElse(currentUser);
        String cleanUrl = (avatarUrl != null && !avatarUrl.trim().isEmpty()) ? avatarUrl.trim() : null;
        user.setAvatarUrl(cleanUrl);
        if (user.getSellerProfile() != null) {
            user.getSellerProfile().setAvatarUrl(cleanUrl);
        }
        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * Change the user's password.
     */
    @Transactional
    public void updatePassword(User currentUser, UpdatePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new BusinessException("WRONG_PASSWORD", "Current password is incorrect");
        }
        if (!request.getNewPassword().equals(request.getNewPasswordConfirmation())) {
            throw new BusinessException("PASSWORD_MISMATCH", "New passwords do not match");
        }
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);
    }

    // ─────────────────────────────────────────────────────────────────
    // EMAIL VERIFICATION
    // ─────────────────────────────────────────────────────────────────

    /**
     * Verify a users email address using the token sent on registration.
     */
    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new BusinessException("INVALID_TOKEN",
                        "Verification link is invalid or has already been used"));

        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setEmailVerificationToken(null); // consume token
        userRepository.save(user);
        log.info("Email verified for user {}", user.getEmail());
    }

    /**
     * Re-send a new verification email (e.g. if original expired or was missed).
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "No account found with that email"));

        if (user.getEmailVerifiedAt() != null) {
            throw new BusinessException("ALREADY_VERIFIED", "Your email address is already verified");
        }

        String newToken = UUID.randomUUID().toString();
        user.setEmailVerificationToken(newToken);
        userRepository.save(user);
        emailService.sendEmailVerification(user, newToken);
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSWORD RESET
    // ─────────────────────────────────────────────────────────────────

    /**
     * Generate a password-reset token and email it to the user.
     * Always responds with success to prevent user enumeration.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().toLowerCase().trim()).ifPresent(user -> {
            String resetToken = UUID.randomUUID().toString();
            user.setResetPasswordToken(resetToken);
            user.setResetPasswordExpiresAt(LocalDateTime.now().plusHours(1)); // 1 hour window
            userRepository.save(user);
            emailService.sendPasswordReset(user, resetToken);
            log.info("Password reset requested for {}", user.getEmail());
        });
        // No-op if user not found — silent success prevents email enumeration
    }

    /**
     * Validate the reset token and set a new password.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetPasswordToken(request.getToken())
                .orElseThrow(() -> new BusinessException("INVALID_TOKEN",
                        "Reset link is invalid or has already been used"));

        if (user.getResetPasswordExpiresAt() == null
                || user.getResetPasswordExpiresAt().isBefore(LocalDateTime.now())) {
            // Clear the expired token
            user.setResetPasswordToken(null);
            user.setResetPasswordExpiresAt(null);
            userRepository.save(user);
            throw new BusinessException("TOKEN_EXPIRED",
                    "Reset link has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetPasswordToken(null);       // consume token
        user.setResetPasswordExpiresAt(null);
        userRepository.save(user);
        log.info("Password reset successful for {}", user.getEmail());
    }

}