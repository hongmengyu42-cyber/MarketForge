package com.marketforge.service;

import com.marketforge.dto.request.LoginRequest;
import com.marketforge.dto.request.RegisterRequest;
import com.marketforge.dto.response.AuthResponse;
import com.marketforge.entity.BuyerProfile;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.repository.BuyerProfileRepository;
import com.marketforge.repository.UserRepository;
import com.marketforge.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BuyerProfileRepository buyerProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private GoogleAuthService googleAuthService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User verifiedUser;
    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        verifiedUser = User.builder()
                .id(1L)
                .name("Verified User")
                .email("verified@marketforge.dev")
                .password("hashed_secret_pw")
                .emailVerifiedAt(LocalDateTime.now())
                .build();

        unverifiedUser = User.builder()
                .id(2L)
                .name("Unverified User")
                .email("unverified@marketforge.dev")
                .password("hashed_secret_pw")
                .emailVerifiedAt(null)
                .emailVerificationToken("token_xyz_123")
                .build();
    }

    @Test
    @DisplayName("Register: successfully creates user, buyer profile, and triggers verification email")
    void register_success() {
        RegisterRequest req = new RegisterRequest();
        req.setName("New User");
        req.setEmail("newuser@marketforge.dev");
        req.setPassword("Password123!");

        when(userRepository.existsByEmail("newuser@marketforge.dev")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pw");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("jwt_mock_token");

        AuthResponse resp = authService.register(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getToken()).isEqualTo("jwt_mock_token");
        assertThat(resp.getUser().getEmail()).isEqualTo("newuser@marketforge.dev");

        verify(buyerProfileRepository).save(any(BuyerProfile.class));
        verify(emailService).sendEmailVerification(any(User.class), anyString());
    }

    @Test
    @DisplayName("Register: throws BusinessException EMAIL_TAKEN when email already exists")
    void register_duplicateEmail_throwsException() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("existing@marketforge.dev");

        when(userRepository.existsByEmail("existing@marketforge.dev")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login: blocks unverified users with EMAIL_NOT_VERIFIED")
    void login_unverifiedUser_throwsException() {
        LoginRequest req = new LoginRequest();
        req.setEmail("unverified@marketforge.dev");
        req.setPassword("Password123!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(userRepository.findByEmail("unverified@marketforge.dev")).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Please verify your email address");

        verify(jwtTokenProvider, never()).generateToken(any());
    }

    @Test
    @DisplayName("Login: verified user logs in successfully and receives JWT")
    void login_verifiedUser_success() {
        LoginRequest req = new LoginRequest();
        req.setEmail("verified@marketforge.dev");
        req.setPassword("Password123!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(userRepository.findByEmail("verified@marketforge.dev")).thenReturn(Optional.of(verifiedUser));
        when(jwtTokenProvider.generateToken(verifiedUser)).thenReturn("jwt_valid_token");

        AuthResponse resp = authService.login(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getToken()).isEqualTo("jwt_valid_token");
        assertThat(resp.getUser().getEmail()).isEqualTo("verified@marketforge.dev");
    }

    @Test
    @DisplayName("VerifyEmail: successfully sets emailVerifiedAt and clears token")
    void verifyEmail_success() {
        when(userRepository.findByEmailVerificationToken("token_xyz_123"))
                .thenReturn(Optional.of(unverifiedUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.verifyEmail("token_xyz_123");

        assertThat(unverifiedUser.getEmailVerifiedAt()).isNotNull();
        assertThat(unverifiedUser.getEmailVerificationToken()).isNull();
        verify(userRepository).save(unverifiedUser);
    }
}
