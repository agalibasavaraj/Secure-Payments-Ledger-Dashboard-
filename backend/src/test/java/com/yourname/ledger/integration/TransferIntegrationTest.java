package com.yourname.ledger.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourname.ledger.auth.dto.AuthDtos.LoginRequest;
import com.yourname.ledger.auth.dto.AuthDtos.RegisterRequest;
import com.yourname.ledger.auth.jwt.JwtService;
import com.yourname.ledger.transaction.dto.TransferDtos.TransferRequest;
import com.yourname.ledger.wallet.dto.WalletDtos.TopUpRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TransferIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Test
    @DisplayName("Negative Security Test: Missing Authorization token returns 401 Unauthorized")
    void testMissingTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/wallets/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Negative Validation Test: Transfer with negative amount returns 400 Bad Request")
    void testNegativeAmountReturns400() throws Exception {
        String token = jwtService.generateToken(1L, "user@test.com", "USER");

        TransferRequest badRequest = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(-500L)
                .build();

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Negative Security Test: Non-admin accessing /api/v1/reports/daily returns 403 Forbidden")
    void testNonAdminReportsAccessReturns403() throws Exception {
        String userToken = jwtService.generateToken(1L, "standard@user.com", "USER");

        mockMvc.perform(get("/api/v1/reports/daily")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }
}
