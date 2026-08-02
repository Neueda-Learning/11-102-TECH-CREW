package com.example.InvestIQ.repository;

import com.example.InvestIQ.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByPortfolioId(Long portfolioId);

    List<Transaction> findByPortfolioIdAndSymbol(Long portfolioId, String symbol);
}

