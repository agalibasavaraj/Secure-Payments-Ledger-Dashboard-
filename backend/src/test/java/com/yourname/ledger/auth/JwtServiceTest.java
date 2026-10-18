package com.yourname.ledger.auth;

import com.yourname.ledger.auth.jwt.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // 256-bit base64 encoded secret
        ReflectionTestUtils.setField(jwtService, "secretKey", "dGhpc0lzQVZlcnlTZWN1cmUzMkJ5dGVLZXlGb3JKV1RUb2tlbnNPbmx5MTIzNDU2Nzg5MDEyMzQ1Ng==");
        ReflectionTestUtils.setField(jwtService, "expirationMinutes", 15L);
    }

    @Test
    @DisplayName("Should generate valid JWT with correct claims and extract subject/role/userId")
    void testJwtGenerationAndExtraction() {
        String token = jwtService.generateToken(42L, "alex@example.com", "USER");

        assertNotNull(token);
        assertEquals("alex@example.com", jwtService.extractEmail(token));
        assertEquals("USER", jwtService.extractRole(token));
        assertEquals(42L, jwtService.extractUserId(token));
        assertTrue(jwtService.isTokenValid(token, "alex@example.com"));
        assertFalse(jwtService.isTokenValid(token, "other@example.com"));
    }
}
