package com.yourname.ledger.transaction;

import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.common.exceptions.CustomExceptions.WalletNotFoundException;
import com.yourname.ledger.transaction.controller.TransactionController;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.wallet.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TransactionControllerTest {

    @Test
    void rejectsWalletHistoryRequestsForWalletsNotOwnedByAuthenticatedUser() {
        TransactionRepository transactionRepository = mock(TransactionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        WalletRepository walletRepository = mock(WalletRepository.class);
        TransactionController controller = new TransactionController(
                transactionRepository, userRepository, walletRepository);
        User authenticatedUser = User.builder().id(42L).email("user@example.com").build();
        var authentication = new UsernamePasswordAuthenticationToken(
                authenticatedUser.getEmail(), null);

        when(userRepository.findByEmail(authenticatedUser.getEmail()))
                .thenReturn(Optional.of(authenticatedUser));
        when(walletRepository.findByIdAndUserId(77L, authenticatedUser.getId()))
                .thenReturn(Optional.empty());

        assertThrows(WalletNotFoundException.class,
                () -> controller.getTransactions(77L, authentication));

        verify(walletRepository).findByIdAndUserId(77L, authenticatedUser.getId());
        verifyNoInteractions(transactionRepository);
    }

    @Test
    void returnsWalletHistoryWhenAuthenticatedUserOwnsWallet() {
        TransactionRepository transactionRepository = mock(TransactionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        WalletRepository walletRepository = mock(WalletRepository.class);
        TransactionController controller = new TransactionController(
                transactionRepository, userRepository, walletRepository);
        User authenticatedUser = User.builder().id(42L).email("user@example.com").build();
        var authentication = new UsernamePasswordAuthenticationToken(
                authenticatedUser.getEmail(), null);

        when(userRepository.findByEmail(authenticatedUser.getEmail()))
                .thenReturn(Optional.of(authenticatedUser));
        when(walletRepository.findByIdAndUserId(77L, authenticatedUser.getId()))
                .thenReturn(Optional.of(com.yourname.ledger.wallet.entity.Wallet.builder()
                        .id(77L).userId(42L).build()));
        when(transactionRepository.findByWalletId(77L))
                .thenReturn(List.of(Transaction.builder().id(1L).build()));

        var response = controller.getTransactions(77L, authentication);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
        verify(walletRepository).findByIdAndUserId(77L, authenticatedUser.getId());
    }
}
