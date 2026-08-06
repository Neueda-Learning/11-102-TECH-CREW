package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record Investment(Long id, Long portfolio_id, String symbol, String assetType, Integer quantity,
						 BigDecimal purchasePrice, LocalDate purchaseDate) {
}

