package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Portfolio;
import com.example.InvestIQ.repository.PortfolioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @InjectMocks
    private PortfolioService portfolioService;

    private Portfolio portfolio;

    @BeforeEach
    void setUp() {
        portfolio = new Portfolio(1L, 1L, "My Portfolio", "Test description",
                LocalDateTime.of(2026, 1, 1, 10, 0));
    }

    // ── createPortfolio ────────────────────────────────────────────────────

    @Test
    @DisplayName("createPortfolio should save and return the new portfolio")
    void createPortfolio_savesAndReturns() {
        when(portfolioRepository.createPortfolio(1L, portfolio)).thenReturn(portfolio);

        var result = portfolioService.createPortfolio(1L, portfolio);

        assertThat(result).isEqualTo(portfolio);
        verify(portfolioRepository).createPortfolio(1L, portfolio);
    }

    // ── getPortfolioByUserId ───────────────────────────────────────────────

    @Test
    @DisplayName("getPortfolioByUserId should return all portfolios for the user")
    void getPortfolioByUserId_returnsList() {
        when(portfolioRepository.getPortfolioByUserId(1L)).thenReturn(List.of(portfolio));

        var result = portfolioService.getPortfolioByUserId(1L);

        assertThat(result).hasSize(1).containsExactly(portfolio);
        verify(portfolioRepository).getPortfolioByUserId(1L);
    }

    @Test
    @DisplayName("getPortfolioByUserId should return empty list when user has no portfolios")
    void getPortfolioByUserId_noPortfolios_returnsEmptyList() {
        when(portfolioRepository.getPortfolioByUserId(99L)).thenReturn(List.of());

        var result = portfolioService.getPortfolioByUserId(99L);

        assertThat(result).isEmpty();
    }

    // ── getPortfolioById ───────────────────────────────────────────────────

    @Test
    @DisplayName("getPortfolioById should return portfolio when found")
    void getPortfolioById_returnsPortfolio() {
        when(portfolioRepository.getPortfolioById(1L)).thenReturn(Optional.of(portfolio));

        var result = portfolioService.getPortfolioById(1L);

        assertThat(result).isEqualTo(portfolio);
    }

    @Test
    @DisplayName("getPortfolioById should return null when not found")
    void getPortfolioById_notFound_returnsNull() {
        when(portfolioRepository.getPortfolioById(99L)).thenReturn(Optional.empty());

        var result = portfolioService.getPortfolioById(99L);

        assertThat(result).isNull();
    }

    // ── updatePortfolio ────────────────────────────────────────────────────

    @Test
    @DisplayName("updatePortfolio should return updated portfolio")
    void updatePortfolio_updatesAndReturns() {
        Portfolio updated = new Portfolio(1L, 1L, "Renamed Portfolio", "New description",
                LocalDateTime.of(2026, 8, 6, 12, 0));

        when(portfolioRepository.updatePortfolio(eq(1L), any(Portfolio.class)))
                .thenReturn(Optional.of(updated));

        var result = portfolioService.updatePortfolio(1L, updated);

        assertThat(result).isEqualTo(updated);
        assertThat(result.name()).isEqualTo("Renamed Portfolio");
        verify(portfolioRepository).updatePortfolio(eq(1L), any(Portfolio.class));
    }

    @Test
    @DisplayName("updatePortfolio should return null when portfolio not found")
    void updatePortfolio_notFound_returnsNull() {
        when(portfolioRepository.updatePortfolio(eq(99L), any(Portfolio.class)))
                .thenReturn(Optional.empty());

        var result = portfolioService.updatePortfolio(99L, portfolio);

        assertThat(result).isNull();
    }

    // ── deletePortfolio ────────────────────────────────────────────────────

    @Test
    @DisplayName("deletePortfolio should delegate to repository")
    void deletePortfolio_callsRepository() {
        portfolioService.deletePortfolio(1L);

        verify(portfolioRepository).deletePortfolioById(1L);
    }
}
