package com.example.InvestIQ.controller;

import com.example.InvestIQ.entity.Portfolio;
import com.example.InvestIQ.service.PortfolioService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class PortfolioController {
    PortfolioService portfolioService;
    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @PostMapping("portfolios/{userId}")
    public Portfolio createPortfolio(@PathVariable Long userId) {
        return portfolioService.createPortfolio(userId);
    }

    @GetMapping("portfolios/{userId}")
    public List<Portfolio> getPortfolioByUserId(@PathVariable Long userId) {
        return portfolioService.getPortfolioByUserId(userId);
    }

    @GetMapping("portfolios/{portfolioId}")
    public Portfolio getPortfolioById(@PathVariable Long portfolioId) {
        return portfolioService.getPortfolioById(portfolioId);
    }

    @PutMapping("portfolios/{portfolioId}")
    public Portfolio updatePortfolio(@PathVariable Long portfolioId, @RequestBody Portfolio portfolio) {
        return portfolioService.updatePortfolio(portfolioId, portfolio);
    }

    @DeleteMapping("portfolios/{portfolioId}")
    public void deletePortfolio(@PathVariable Long portfolioId) {
        portfolioService.deletePortfolio(portfolioId);
    }



}
