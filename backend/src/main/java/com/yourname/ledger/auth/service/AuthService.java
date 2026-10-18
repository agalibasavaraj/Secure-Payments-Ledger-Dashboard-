package com.yourname.ledger.auth.service;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.auth.dto.AuthDtos.*;
import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.jwt.JwtService;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.common.exceptions.CustomExceptions.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    @Value("${security.lockout.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${security.lockout.lockout-duration-minutes:5}")
    private int lockoutDurationMinutes;

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("User with email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .failedAttempts(0)
                .build();

        User savedUser = userRepository.save(user);
        auditService.logAction(savedUser.getId(), "USER_REGISTERED", "User", savedUser.getId().toString(), ipAddress);

        String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
        return AuthResponse.builder().token(token).build();
    }

    @Transactional(noRollbackFor = {IllegalArgumentException.class, AccountLockedException.class})
    public AuthResponse login(LoginRequest request, String ipAddress) {
        User user = userRepository.findByEmailForUpdate(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        Instant now = Instant.now();

        // Check Account Lockout
        if (user.getLockedUntil() != null) {
            if (now.isBefore(user.getLockedUntil())) {
                long minutesLeft = ChronoUnit.MINUTES.between(now, user.getLockedUntil()) + 1;
                auditService.logActionWithinTransaction(
                        user.getId(), "LOGIN_LOCKED_ATTEMPT", "User", user.getId().toString(), ipAddress);
                throw new AccountLockedException("Account is locked due to too many failed attempts. Try again in " + minutesLeft + " minutes.");
            } else {
                // Lockout period has elapsed; reset lock
                user.setLockedUntil(null);
                user.setFailedAttempts(0);
            }
        }

        // Validate Password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);

            if (attempts >= maxFailedAttempts) {
                user.setLockedUntil(now.plus(lockoutDurationMinutes, ChronoUnit.MINUTES));
                userRepository.save(user);
                auditService.logActionWithinTransaction(
                        user.getId(), "ACCOUNT_LOCKED", "User", user.getId().toString(), ipAddress);
                throw new AccountLockedException("Account locked for " + lockoutDurationMinutes
                        + " minutes due to " + maxFailedAttempts + " consecutive failed login attempts.");
            }

            userRepository.save(user);
            auditService.logActionWithinTransaction(
                    user.getId(), "LOGIN_FAILED", "User", user.getId().toString(), ipAddress);
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Successful Login
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        auditService.logActionWithinTransaction(
                user.getId(), "LOGIN_SUCCESS", "User", user.getId().toString(), ipAddress);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.builder().token(token).build();
    }
}
