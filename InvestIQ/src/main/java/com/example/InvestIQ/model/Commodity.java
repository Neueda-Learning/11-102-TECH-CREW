package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record Commodity(Long id, String symbol, String name, CommodityType category, String unit,
						BigDecimal currentPrice, BigDecimal priceChange, BigDecimal percentChange,
						LocalDateTime lastUpdated) {
}
