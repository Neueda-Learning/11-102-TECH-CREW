package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.repository.BondRepository;
import com.example.InvestIQ.repository.CommodityRepository;
import com.example.InvestIQ.repository.InvestmentRepository;
import com.example.InvestIQ.repository.StockQuoteRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvestmentServiceTest {

    @Mock private InvestmentRepository investmentRepository;
    @Mock private StockQuoteRepository stockQuoteRepository;
    @Mock private BondRepository bondRepository;
    @Mock private CommodityRepository commodityRepository;
    @Mock private AlphaVantageService alphaVantageService;
    @Mock private TransactionRepository transactionRepository;

    @InjectMocks
    private InvestmentService investmentService;

    private Investment investment;

    @BeforeEach
    void setUp() {
        investment = new Investment(1L, 1L, "AAPL", "STOCK", 10,
                new BigDecimal("150.00"), LocalDate.of(2026, 1, 1));
    }

    // ── getInvestmentsByUserId

    @Test
    @DisplayName("getInvestmentsByUserId should return all investments for user")
    void getInvestmentsByUserId_returnInvestment() {
        when(investmentRepository.findByUserId(1L)).thenReturn(List.of(investment));

        var result = investmentService.getInvestmentsByUserId(1L);

        assertThat(result).hasSize(1).containsExactly(investment);
        verify(investmentRepository).findByUserId(1L);
    }

    @Test
    @DisplayName("getInvestmentsByUserId should return empty list when none found")
    void getInvestmentsByUserId_noInvestments_returnsEmptyList() {
        when(investmentRepository.findByUserId(99L)).thenReturn(List.of());

        var result = investmentService.getInvestmentsByUserId(99L);

        assertThat(result).isEmpty();
    }

    // ── getInvestmentById ──────────────────────────────────────────────────

    @Test
    @DisplayName("getInvestmentById should return investment when found")
    void getInvestmentById_returnsInvestment() {
        when(investmentRepository.findById(1L)).thenReturn(Optional.of(investment));

        var result = investmentService.getInvestmentById(1L);

        assertThat(result).isEqualTo(investment);
    }

    @Test
    @DisplayName("getInvestmentById should return null when not found")
    void getInvestmentById_notFound_returnsNull() {
        when(investmentRepository.findById(99L)).thenReturn(Optional.empty());

        var result = investmentService.getInvestmentById(99L);

        assertThat(result).isNull();
    }

    // ── getInvestmentsByPortfolioId ────────────────────────────────────────

    @Test
    @DisplayName("getInvestmentsByPortfolioId should return investments for portfolio")
    void getInvestmentsByPortfolioId_returnsList() {
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(investment));

        var result = investmentService.getInvestmentsByPortfolioId(1L);

        assertThat(result).containsExactly(investment);
        verify(investmentRepository).findByPortfolioId(1L);
    }

    // ── updateInvestment ───────────────────────────────────────────────────

    @Test
    @DisplayName("updateInvestment should update and return the investment")
    void updateInvestment_updatesAndReturns() {
        Investment patch = new Investment(null, null, "TSLA", "STOCK", 5,
                new BigDecimal("200.00"), LocalDate.of(2026, 6, 1));
        Investment expected = new Investment(1L, 1L, "TSLA", "STOCK", 5,
                new BigDecimal("200.00"), LocalDate.of(2026, 6, 1));

        when(investmentRepository.findById(1L)).thenReturn(Optional.of(investment));
        when(investmentRepository.update(eq(1L), any(Investment.class))).thenReturn(Optional.of(expected));

        var result = investmentService.updateInvestment(1L, patch);

        assertThat(result).isEqualTo(expected);
        verify(investmentRepository).update(eq(1L), any(Investment.class));
    }

    @Test
    @DisplayName("updateInvestment should return null when investment not found")
    void updateInvestment_notFound_returnsNull() {
        when(investmentRepository.findById(99L)).thenReturn(Optional.empty());

        var result = investmentService.updateInvestment(99L, investment);

        assertThat(result).isNull();
    }

    // ── createInvestment ───────────────────────────────────────────────────

    @Test
    @DisplayName("createInvestment should save new holding when no existing position")
    void createInvestment_newHolding_savesAndReturns() {
        Investment input = new Investment(null, 1L, "AAPL", "STOCK", 5,
                new BigDecimal("180.00"), LocalDate.of(2026, 8, 6));
        Investment saved = new Investment(2L, 1L, "AAPL", "STOCK", 5,
                new BigDecimal("180.00"), LocalDate.of(2026, 8, 6));

        Map<String, Object> overview = Map.of("Symbol", "AAPL", "Currency", "USD", "Name", "Apple Inc.");
        Map<String, Object> quote = Map.of("05. price", "180.00", "09. change", "1.00",
                "10. change percent", "0.56%", "08. previous close", "179.00",
                "03. high", "182.00", "04. low", "178.00");

        when(alphaVantageService.fetchCompanyOverview("AAPL")).thenReturn(Optional.of(overview));
        when(alphaVantageService.fetchGlobalQuote("AAPL")).thenReturn(Optional.of(quote));
        when(stockQuoteRepository.findBySymbol("AAPL")).thenReturn(Optional.empty());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of());
        when(investmentRepository.save(any(Investment.class))).thenReturn(saved);

        var result = investmentService.createInvestment(1L, input);

        assertThat(result).isEqualTo(saved);
        verify(investmentRepository).save(any(Investment.class));
        verify(transactionRepository).save(eq(1L), any());
    }

    @Test
    @DisplayName("createInvestment should average up when existing holding found")
    void createInvestment_existingHolding_averagesUpPosition() {
        Investment existing = new Investment(1L, 1L, "AAPL", "STOCK", 10,
                new BigDecimal("150.00"), LocalDate.of(2026, 1, 1));
        Investment input = new Investment(null, 1L, "AAPL", "STOCK", 10,
                new BigDecimal("170.00"), LocalDate.of(2026, 8, 6));
        Investment averaged = new Investment(1L, 1L, "AAPL", "STOCK", 20,
                new BigDecimal("160.00"), LocalDate.of(2026, 8, 6));

        Map<String, Object> overview = Map.of("Symbol", "AAPL", "Currency", "USD", "Name", "Apple Inc.");
        Map<String, Object> quote = Map.of("05. price", "170.00", "09. change", "0.50",
                "10. change percent", "0.30%", "08. previous close", "169.50",
                "03. high", "171.00", "04. low", "168.00");

        when(alphaVantageService.fetchCompanyOverview("AAPL")).thenReturn(Optional.of(overview));
        when(alphaVantageService.fetchGlobalQuote("AAPL")).thenReturn(Optional.of(quote));
        when(stockQuoteRepository.findBySymbol("AAPL")).thenReturn(Optional.empty());
        when(investmentRepository.findByPortfolioId(1L)).thenReturn(List.of(existing));
        when(investmentRepository.update(eq(1L), any(Investment.class))).thenReturn(Optional.of(averaged));

        var result = investmentService.createInvestment(1L, input);

        assertThat(result.quantity()).isEqualTo(20);
        assertThat(result.purchasePrice()).isEqualByComparingTo("160.00");
        verify(investmentRepository).update(eq(1L), any(Investment.class));
    }

    @Test
    @DisplayName("createInvestment should throw when symbol is blank")
    void createInvestment_blankSymbol_throws() {
        Investment bad = new Investment(null, 1L, "  ", "STOCK", 5,
                new BigDecimal("100.00"), LocalDate.now());

        assertThatThrownBy(() -> investmentService.createInvestment(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Symbol is required");
    }

    @Test
    @DisplayName("createInvestment should throw when quantity is zero or negative")
    void createInvestment_zeroQuantity_throws() {
        Investment bad = new Investment(null, 1L, "AAPL", "STOCK", 0,
                new BigDecimal("100.00"), LocalDate.now());

        assertThatThrownBy(() -> investmentService.createInvestment(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Quantity must be greater than zero");
    }

    @Test
    @DisplayName("createInvestment should throw when price is zero or negative")
    void createInvestment_zeroPurchasePrice_throws() {
        Investment bad = new Investment(null, 1L, "AAPL", "STOCK", 5,
                BigDecimal.ZERO, LocalDate.now());

        assertThatThrownBy(() -> investmentService.createInvestment(1L, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Purchase price must be greater than zero");
    }

    @Test
    @DisplayName("createInvestment should throw when company overview is unavailable")
    void createInvestment_overviewUnavailable_throws() {
        Investment input = new Investment(null, 1L, "UNKNOWN", "STOCK", 5,
                new BigDecimal("10.00"), LocalDate.now());

        when(alphaVantageService.fetchCompanyOverview("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> investmentService.createInvestment(1L, input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unable to fetch overview for symbol: UNKNOWN");
    }
}
