package com.example.InvestIQ.controller;

import com.example.InvestIQ.model.Transaction;
import com.example.InvestIQ.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {
    private final TransactionService transactionService;
    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/{portfolioId}")
    public List<Transaction> getTransactionsByPortfolioId(@PathVariable Long portfolioId) {
        return transactionService.getTransactionsByPortfolioId(portfolioId);
    }

    @PostMapping("/{portfolioId}")
    public Transaction createTransaction(@PathVariable Long portfolioId, @RequestBody Transaction transaction) {
        return transactionService.createTransaction(portfolioId,transaction);
    }
}
