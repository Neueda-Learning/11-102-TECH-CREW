package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDate;


public record Bond(Long id, String symbol, String currency, String issuer, BigDecimal faceValue, BigDecimal couponRate, LocalDate maturityDate) {
}
