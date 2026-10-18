package com.yourname.ledger.integration;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.auth.dto.AuthDtos.LoginRequest;
import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.auth.service.AuthService;
import com.yourname.ledger.common.exceptions.CustomExceptions.AccountLockedException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthLockoutPersistenceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @MockBean
    private AuditService auditService;

    private User user;

    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder()
                .email("lockout-" + UUID.randomUUID() + "@example.com")
                .passwordHash(passwordEncoder.encode("correct-password"))
                .role("USER")
                .build());
    }

    @Test
    void failedLoginAttemptsAndLockStateSurviveAuthenticationErrors() {
        LoginRequest wrongPassword = LoginRequest.builder()
                .email(user.getEmail())
                .password("incorrect-password")
                .build();

        for (int attempt = 1; attempt < 5; attempt++) {
            assertThrows(IllegalArgumentException.class,
                    () -> authService.login(wrongPassword, "127.0.0.1"));
        }
        assertThrows(AccountLockedException.class,
                () -> authService.login(wrongPassword, "127.0.0.1"));

        entityManager.flush();
        entityManager.clear();

        User lockedUser = userRepository.findById(user.getId()).orElseThrow();
        assertEquals(5, lockedUser.getFailedAttempts());
        assertNotNull(lockedUser.getLockedUntil());

        assertThrows(AccountLockedException.class,
                () -> authService.login(wrongPassword, "127.0.0.1"));
    }
}
