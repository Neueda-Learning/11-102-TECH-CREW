package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockQuote(Long id, String symbol, String companyName, BigDecimal currentPrice, BigDecimal priceChange, BigDecimal percentChange, BigDecimal previousClose, BigDecimal dayHigh, BigDecimal dayLow, LocalDateTime lastUpdated) {
}
