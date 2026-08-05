package com.example.InvestIQ.controller;

import com.example.InvestIQ.entity.Investment;
import com.example.InvestIQ.service.InvestmentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

public class InvestmentController {
    InvestmentService investmentService;
    public InvestmentController(InvestmentService investmentService) {
        this.investmentService = investmentService;
    }
    @GetMapping("/investments/{userId}")
    public Investment getInvestmentsByUserId(@PathVariable Long userId) {
        return investmentService.getInvestmentsByUserId(userId);
    }
    @GetMapping("/investments/{userId}/{investmentId}")
    public Investment getInvestmentById(@PathVariable Long userId,@PathVariable Long investmentId) {
        return investmentService.getInvestmentById(investmentId);
    }
    @GetMapping("investments/{portfolioId}")
    public Investment getInvestmentsByPortfolioId(@PathVariable Long portfolioId) {
        return investmentService.getInvestmentsByPortfolioId(portfolioId);
    }
    @PutMapping
    public Investment updateInvestment(@PathVariable Long investmentId, @RequestBody Investment investment) {
        return investmentService.updateInvestment(investmentId, investment);
    }

}
