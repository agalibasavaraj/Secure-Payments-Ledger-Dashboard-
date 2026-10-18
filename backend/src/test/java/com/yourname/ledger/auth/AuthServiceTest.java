package com.yourname.ledger.auth;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.auth.dto.AuthDtos.LoginRequest;
import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.jwt.JwtService;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.auth.service.AuthService;
import com.yourname.ledger.common.exceptions.CustomExceptions.AccountLockedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockoutDurationMinutes", 5);
        user = User.builder()
                .id(1L)
                .email("user@example.com")
                .passwordHash("encoded-password")
                .role("USER")
                .failedAttempts(0)
                .build();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), eq(user.getPasswordHash()))).thenReturn(false);
    }

    @Test
    void persistsFailedAttemptsAndLocksAccountOnConfiguredThreshold() {
        LoginRequest request = LoginRequest.builder()
                .email(user.getEmail())
                .password("wrong-password")
                .build();

        for (int attempt = 1; attempt < 5; attempt++) {
            assertEquals("Invalid email or password", assertThrows(IllegalArgumentException.class,
                    () -> authService.login(request, "127.0.0.1")).getMessage());
            assertEquals(attempt, user.getFailedAttempts());
            assertNull(user.getLockedUntil());
        }

        assertThrows(AccountLockedException.class,
                () -> authService.login(request, "127.0.0.1"));

        assertEquals(5, user.getFailedAttempts());
        assertNotNull(user.getLockedUntil());
        verify(userRepository, times(5)).save(user);

        assertThrows(AccountLockedException.class,
                () -> authService.login(request, "127.0.0.1"));
        verify(passwordEncoder, times(5)).matches(anyString(), anyString());
    }
}
