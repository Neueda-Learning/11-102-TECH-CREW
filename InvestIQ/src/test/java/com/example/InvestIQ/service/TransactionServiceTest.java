package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.model.Transaction;
import com.example.InvestIQ.repository.InvestmentRepository;
import com.example.InvestIQ.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private InvestmentRepository investmentRepository;

    @InjectMocks
    private TransactionService transactionService;

    private Transaction buyTransaction;
    private Investment existingHolding;

    @BeforeEach
    void setUp() {
        buyTransaction = new Transaction(
                null,
                1L,
                " aapl ",
                " stock ",
                " buy ",
                5,
                new BigDecimal("200.00"),
                LocalDateTime.of(2026, 8, 6, 10, 0)
        );

        existingHolding = new Investment(
                10L,
                1L,
                "AAPL",
                "STOCK",
                10,
                new BigDecimal("150.00"),
                LocalDate.of(2026, 1, 1)
        );
    }

    @Test
    @DisplayName("getTransactionsByPortfolioId should return repository results")
    void getTransactionsByPortfolioId_returnsList() {
        Transaction tx = new Transaction(1L, 1L, "AAPL", "STOCK", "BUY", 1,
                new BigDecimal("100.00"), LocalDateTime.of(2026, 8, 6, 12, 0));
        when(transactionRepository.findByPortfolioId(1L)).thenReturn(List.of(tx));

        var result = transactionService.getTransactionsByPortfolioId(1L);

        assertThat(result).hasSize(1).containsExactly(tx);
        verify(transactionRepository).findByPortfolioId(1L);
    }

    @Test
    @DisplayName("createTransaction BUY should create new holding when none exists")
    void createTransaction_buy_newHolding_savesInvestmentAndTransaction() {
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of());
        when(investmentRepository.save(any(Investment.class))).thenReturn(existingHolding);
        when(transactionRepository.save(eq(1L), any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        var result = transactionService.createTransaction(1L, buyTransaction);

        assertThat(result.portfolio_id()).isEqualTo(1L);
        assertThat(result.symbol()).isEqualTo("AAPL");
        assertThat(result.assetType()).isEqualTo("STOCK");
        assertThat(result.transactionType()).isEqualTo("BUY");
        verify(investmentRepository).save(any(Investment.class));
        verify(transactionRepository).save(eq(1L), any(Transaction.class));
    }

    @Test
    @DisplayName("createTransaction BUY should average price when holding exists")
    void createTransaction_buy_existingHolding_updatesAveragePrice() {
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));
        when(investmentRepository.update(eq(10L), any(Investment.class)))
                .thenAnswer(invocation -> Optional.of(invocation.getArgument(1)));
        when(transactionRepository.save(eq(1L), any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        var result = transactionService.createTransaction(1L, buyTransaction);

        assertThat(result.transactionType()).isEqualTo("BUY");
        verify(investmentRepository).update(eq(10L), any(Investment.class));
        verify(investmentRepository, never()).save(any(Investment.class));
    }

    @Test
    @DisplayName("createTransaction SELL should reduce quantity when partially selling")
    void createTransaction_sell_partial_updatesHolding() {
        Transaction sell = new Transaction(null, 1L, "AAPL", "STOCK", "SELL", 4,
                new BigDecimal("210.00"), LocalDateTime.now());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));
        when(investmentRepository.update(eq(10L), any(Investment.class)))
                .thenAnswer(invocation -> Optional.of(invocation.getArgument(1)));
        when(transactionRepository.save(eq(1L), any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        var result = transactionService.createTransaction(1L, sell);

        assertThat(result.transactionType()).isEqualTo("SELL");
        verify(investmentRepository).update(eq(10L), any(Investment.class));
        verify(investmentRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("createTransaction SELL should delete holding when quantity reaches zero")
    void createTransaction_sell_full_deletesHolding() {
        Transaction sellAll = new Transaction(null, 1L, "AAPL", "STOCK", "SELL", 10,
                new BigDecimal("210.00"), LocalDateTime.now());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));
        when(transactionRepository.save(eq(1L), any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        var result = transactionService.createTransaction(1L, sellAll);

        assertThat(result.transactionType()).isEqualTo("SELL");
        verify(investmentRepository).deleteById(10L);
        verify(investmentRepository, never()).update(eq(10L), any(Investment.class));
    }

    @Test
    @DisplayName("createTransaction should throw for invalid transaction type")
    void createTransaction_invalidType_throws() {
        Transaction invalid = new Transaction(null, 1L, "AAPL", "STOCK", "HOLD", 1,
                new BigDecimal("10.00"), LocalDateTime.now());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));

        assertThatThrownBy(() -> transactionService.createTransaction(1L, invalid))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("transactionType must be BUY or SELL");

        verify(transactionRepository, never()).save(eq(1L), any(Transaction.class));
    }

    @Test
    @DisplayName("createTransaction SELL should throw when holding does not exist")
    void createTransaction_sellWithoutHolding_throws() {
        Transaction sell = new Transaction(null, 1L, "AAPL", "STOCK", "SELL", 1,
                new BigDecimal("100.00"), LocalDateTime.now());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, sell))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot sell an asset that is not in holdings");
    }

    @Test
    @DisplayName("createTransaction SELL should throw when quantity exceeds holding")
    void createTransaction_sellTooMuch_throws() {
        Transaction oversell = new Transaction(null, 1L, "AAPL", "STOCK", "SELL", 11,
                new BigDecimal("100.00"), LocalDateTime.now());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));

        assertThatThrownBy(() -> transactionService.createTransaction(1L, oversell))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Sell quantity exceeds available holding quantity");
    }

    @Test
    @DisplayName("createTransaction should throw when BUY update fails")
    void createTransaction_buyUpdateFails_throws() {
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existingHolding));
        when(investmentRepository.update(eq(10L), any(Investment.class))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, buyTransaction))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Failed to update holding for BUY");
    }

    @Test
    @DisplayName("createTransaction should throw when payload is null")
    void createTransaction_nullPayload_throws() {
        assertThatThrownBy(() -> transactionService.createTransaction(1L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Transaction payload is required");
    }

    @Test
    @DisplayName("createTransaction should throw when symbol is blank")
    void createTransaction_blankSymbol_throws() {
        Transaction bad = new Transaction(null, 1L, " ", "STOCK", "BUY", 1,
                new BigDecimal("100.00"), LocalDateTime.now());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Symbol is required");
    }

    @Test
    @DisplayName("createTransaction should throw when assetType is blank")
    void createTransaction_blankAssetType_throws() {
        Transaction bad = new Transaction(null, 1L, "AAPL", " ", "BUY", 1,
                new BigDecimal("100.00"), LocalDateTime.now());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Asset type is required");
    }

    @Test
    @DisplayName("createTransaction should throw when transactionType is blank")
    void createTransaction_blankTransactionType_throws() {
        Transaction bad = new Transaction(null, 1L, "AAPL", "STOCK", " ", 1,
                new BigDecimal("100.00"), LocalDateTime.now());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Transaction type is required");
    }

    @Test
    @DisplayName("createTransaction should throw when quantity is non-positive")
    void createTransaction_nonPositiveQuantity_throws() {
        Transaction bad = new Transaction(null, 1L, "AAPL", "STOCK", "BUY", 0,
                new BigDecimal("100.00"), LocalDateTime.now());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Quantity must be greater than zero");
    }

    @Test
    @DisplayName("createTransaction should throw when price is non-positive")
    void createTransaction_nonPositivePrice_throws() {
        Transaction bad = new Transaction(null, 1L, "AAPL", "STOCK", "BUY", 1,
                BigDecimal.ZERO, LocalDateTime.now());

        assertThatThrownBy(() -> transactionService.createTransaction(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Price must be greater than zero");
    }
}
