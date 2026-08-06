package com.example.InvestIQ.controller;

import com.example.InvestIQ.model.Portfolio;
import com.example.InvestIQ.service.PortfolioService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/portfolios")
public class PortfolioController {
    private final PortfolioService portfolioService;
    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @PostMapping("/user/{userId}")
    public Portfolio createPortfolio(@PathVariable Long userId, @RequestBody Portfolio portfolio) {
        return portfolioService.createPortfolio(userId, portfolio);
    }

    @GetMapping("/user/{userId}")
    public List<Portfolio> getPortfolioByUserId(@PathVariable Long userId) {
        return portfolioService.getPortfolioByUserId(userId);
    }

    @GetMapping("/{portfolioId}")
    public Portfolio getPortfolioById(@PathVariable Long portfolioId) {
        return portfolioService.getPortfolioById(portfolioId);
    }

    @PutMapping("/{portfolioId}")
    public Portfolio updatePortfolio(@PathVariable Long portfolioId, @RequestBody Portfolio portfolio) {
        return portfolioService.updatePortfolio(portfolioId, portfolio);
    }

    @DeleteMapping("/{portfolioId}")
    public void deletePortfolio(@PathVariable Long portfolioId) {
        portfolioService.deletePortfolio(portfolioId);
    }



}
