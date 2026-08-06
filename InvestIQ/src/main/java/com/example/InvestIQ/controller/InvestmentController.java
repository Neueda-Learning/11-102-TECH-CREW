package com.example.InvestIQ.controller;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.service.InvestmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/investments")
public class InvestmentController {

    private final InvestmentService investmentService;

    public InvestmentController(InvestmentService investmentService) {
        this.investmentService = investmentService;
    }

    @GetMapping("/user/{userId}")
    public List<Investment> getInvestmentsByUserId(@PathVariable Long userId) {
        return investmentService.getInvestmentsByUserId(userId);
    }

    @GetMapping("/{investmentId}")
    public Investment getInvestmentById(@PathVariable Long investmentId) {
        return investmentService.getInvestmentById(investmentId);
    }

    @GetMapping("/portfolio/{portfolioId}")
    public List<Investment> getInvestmentsByPortfolioId(@PathVariable Long portfolioId) {
        return investmentService.getInvestmentsByPortfolioId(portfolioId);
    }

    @PostMapping("/portfolio/{portfolioId}")
    public Investment createInvestment(@PathVariable Long portfolioId, @RequestBody Investment investment) {
        return investmentService.createInvestment(portfolioId, investment);
    }

    @PutMapping("/{investmentId}")
    public Investment updateInvestment(@PathVariable Long investmentId, @RequestBody Investment investment) {
        return investmentService.updateInvestment(investmentId, investment);
    }

}
