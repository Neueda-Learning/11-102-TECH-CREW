package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Portfolio;
import com.example.InvestIQ.repository.PortfolioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PortfolioService {
    private final PortfolioRepository portfolioRepository;
    PortfolioService(PortfolioRepository portfolioRepository) {
        this.portfolioRepository = portfolioRepository;
    }

    public Portfolio createPortfolio(Long userId) {
        return portfolioRepository.createPortfolio(userId);
    }

    public List<Portfolio> getPortfolioByUserId(Long userId) {
        return portfolioRepository.getPortfolioByUserId(userId);
    }

    public Portfolio getPortfolioById(Long portfolioId) {
        return portfolioRepository.getPortfolioById(portfolioId).orElse(null);
    }

    public Portfolio updatePortfolio(Long portfolioId, Portfolio portfolio) {
        return portfolioRepository.updatePortfolio(portfolioId, portfolio).orElse(null);
    }

    public void deletePortfolio(Long portfolioId) {
        portfolioRepository.deletePortfolioById(portfolioId);
    }
}

