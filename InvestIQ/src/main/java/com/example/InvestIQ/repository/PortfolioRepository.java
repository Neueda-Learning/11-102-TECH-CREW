package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Portfolio;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface PortfolioRepository {
    Portfolio createPortfolio(Long userId, Portfolio portfolio);
    List<Portfolio> getPortfolioByUserId(Long userId);
    Optional<Portfolio> getPortfolioById(Long portfolioId);
    Optional<Portfolio> updatePortfolio(Long portfolioId, Portfolio portfolio);
    void deletePortfolioById(Long portfolioId);
}

