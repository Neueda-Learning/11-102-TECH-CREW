package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record Transaction(Long id, Long portfolio_id, String symbol, String assetType, String transactionType, Integer quantity, BigDecimal price, LocalDateTime transactionDate) {
}
