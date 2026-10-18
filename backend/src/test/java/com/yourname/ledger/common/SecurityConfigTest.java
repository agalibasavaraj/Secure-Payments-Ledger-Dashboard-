package com.yourname.ledger.common;

import com.yourname.ledger.auth.jwt.JwtAuthFilter;
import com.yourname.ledger.common.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void corsAllowsOnlyConfiguredOriginsAndDoesNotEnableCredentials() {
        SecurityConfig config = new SecurityConfig(mock(JwtAuthFilter.class));
        ReflectionTestUtils.setField(
                config, "allowedOriginPatterns", "http://localhost:3000, https://ledger.example");
        var source = config.corsConfigurationSource();

        MockHttpServletRequest localRequest = new MockHttpServletRequest();
        localRequest.addHeader("Origin", "http://localhost:3000");
        var localCors = source.getCorsConfiguration(localRequest);

        MockHttpServletRequest untrustedRequest = new MockHttpServletRequest();
        untrustedRequest.addHeader("Origin", "https://attacker.example");
        var untrustedCors = source.getCorsConfiguration(untrustedRequest);

        assertEquals(List.of("http://localhost:3000", "https://ledger.example"),
                localCors.getAllowedOriginPatterns());
        assertFalse(localCors.getAllowCredentials());
        assertNull(untrustedCors.checkOrigin("https://attacker.example"));
    }
}
