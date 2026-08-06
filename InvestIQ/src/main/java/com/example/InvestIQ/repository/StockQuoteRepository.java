package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.StockQuote;
import org.springframework.stereotype.Repository;

import java.util.Optional;

public interface StockQuoteRepository {
    Optional<StockQuote> findBySymbol(String symbol);
    Optional<StockQuote> addStockQuote(StockQuote stockQuote);
}

