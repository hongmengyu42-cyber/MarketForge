package com.marketforge.controller;

import com.marketforge.dto.request.GoogleLoginRequest;
import com.marketforge.dto.request.LoginRequest;
import com.marketforge.dto.request.RegisterRequest;
import com.marketforge.dto.request.ForgotPasswordRequest;
import com.marketforge.dto.request.ResetPasswordRequest;
import com.marketforge.dto.request.UpdatePasswordRequest;
import com.marketforge.dto.request.UpdateProfileRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.AuthResponse;
import com.marketforge.dto.response.UserResponse;
import com.marketforge.entity.User;
import com.marketforge.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/register
     * Register a new buyer account.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created successfully", response));
    }

    /**
     * POST /api/v1/auth/login
     * Authenticate and receive a JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    /**
     * POST /api/v1/auth/google
     * Authenticate or register with Google OAuth2 ID Token.
     */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @RequestBody GoogleLoginRequest request) {
        AuthResponse response = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Google login successful", response));
    }

    /**
     * POST /api/v1/auth/logout
     * Client-side logout (token is invalidated on client by discarding it).
     * With stateless JWT, server doesn't track tokens — client simply removes it.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Logged out successfully")
                .build());
    }

    /**
     * GET /api/v1/auth/me
     * Get current authenticated user profile.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(
            @AuthenticationPrincipal User currentUser) {
        UserResponse user = authService.me(currentUser);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    /**
     * PATCH /api/v1/auth/me
     * Update profile (name, phone, bio, displayName, hourlyRate, etc.)
     */
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse updated = authService.updateProfile(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    /**
     * PATCH /api/v1/auth/me/avatar
     * Quick update or remove avatar URL.
     */
    @PatchMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserResponse>> updateAvatar(
            @AuthenticationPrincipal User currentUser,
            @RequestBody java.util.Map<String, String> body) {
        String avatarUrl = body != null ? body.get("avatarUrl") : null;
        UserResponse updated = authService.updateAvatar(currentUser, avatarUrl);
        return ResponseEntity.ok(ApiResponse.success("Avatar updated successfully", updated));
    }

    /**
     * POST /api/v1/auth/me/password
     * Change password (requires current password).
     */
    @PostMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdatePasswordRequest request) {
        authService.updatePassword(currentUser, request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password changed successfully")
                .build());
    }

    // ─────────────────────────────────────────────────────────────────
    // EMAIL VERIFICATION
    // ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/auth/verify-email?token=...
     * Confirm email address using the token from the verification email.
     */
    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Email verified successfully. You can now log in.")
                .build());
    }

    /**
     * POST /api/v1/auth/resend-verification
     * Resend the verification email to the given address.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@RequestBody java.util.Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false).message("Email is required").build());
        }
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Verification email sent. Please check your inbox.")
                .build());
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSWORD RESET
    // ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/auth/forgot-password
     * Request a password reset link (always returns 200 to prevent enumeration).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("If an account with that email exists, a reset link has been sent.")
                .build());
    }

    /**
     * POST /api/v1/auth/reset-password
     * Confirm the token and set a new password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password reset successful. You can now log in with your new password.")
                .build());
    }

}