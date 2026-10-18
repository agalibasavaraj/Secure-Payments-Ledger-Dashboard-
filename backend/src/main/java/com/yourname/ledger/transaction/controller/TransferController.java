package com.yourname.ledger.transaction.controller;

import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.transaction.dto.TransferDtos.*;
import com.yourname.ledger.transaction.service.TransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
@Tag(name = "Transfers", description = "Execute atomic, idempotent money transfers between demo wallets")
public class TransferController {

    private final TransferService transferService;
    private final UserRepository userRepository;

    private Long getAuthenticatedUserId(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @PostMapping
    @Operation(summary = "Transfer money", description = "Executes an idempotent transfer using ordered pessimistic locking and fraud engine")
    public ResponseEntity<TransactionResponse> transfer(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody TransferRequest request,
            Authentication auth,
            HttpServletRequest servletRequest
    ) {
        Long userId = getAuthenticatedUserId(auth);
        TransactionResponse response = transferService.processTransfer(
                userId,
                idempotencyKey,
                request,
                servletRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(response);
    }
}
