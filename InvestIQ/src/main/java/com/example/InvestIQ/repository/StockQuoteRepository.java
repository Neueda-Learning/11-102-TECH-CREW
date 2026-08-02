package com.example.InvestIQ.repository;

import com.example.InvestIQ.entity.StockQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockQuoteRepository extends JpaRepository<StockQuote, Long> {
    Optional<StockQuote> findBySymbol(String symbol);
}

