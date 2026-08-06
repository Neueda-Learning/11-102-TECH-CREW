package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Transaction;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface TransactionRepository {
    List<Transaction> findByPortfolioId(Long findByPortfolioId);

    Transaction save(Long portfolioId, Transaction transaction);
}

