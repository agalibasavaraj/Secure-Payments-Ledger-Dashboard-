package com.yourname.ledger.wallet.controller;

import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.wallet.dto.WalletDtos.*;
import com.yourname.ledger.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallets", description = "Manage user wallets and demo balance top-ups")
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    private Long getAuthenticatedUserId(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @PostMapping
    @Operation(summary = "Create demo wallet", description = "Initializes an isolated wallet for the logged-in user")
    public ResponseEntity<WalletResponse> createWallet(Authentication auth, HttpServletRequest request) {
        Long userId = getAuthenticatedUserId(auth);
        WalletResponse response = walletService.createWallet(userId, request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user wallet", description = "Returns the wallet owned by the currently authenticated user")
    public ResponseEntity<WalletResponse> getMyWallet(Authentication auth) {
        Long userId = getAuthenticatedUserId(auth);
        WalletResponse response = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wallet by ID", description = "Returns wallet details if caller is the owner")
    public ResponseEntity<WalletResponse> getWallet(@PathVariable Long id, Authentication auth) {
        Long userId = getAuthenticatedUserId(auth);
        WalletResponse response = walletService.getWallet(id, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/topup")
    @Operation(summary = "Top up wallet", description = "Simulated deposit crediting minor units directly to the wallet balance")
    public ResponseEntity<WalletResponse> topUp(
            @PathVariable Long id,
            @Valid @RequestBody TopUpRequest request,
            Authentication auth,
            HttpServletRequest servletRequest
    ) {
        Long userId = getAuthenticatedUserId(auth);
        WalletResponse response = walletService.topUp(id, request.getAmountMinor(), userId, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }
}
