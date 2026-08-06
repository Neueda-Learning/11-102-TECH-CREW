package com.example.InvestIQ.model;

import java.math.BigDecimal;
import java.time.LocalDate;

//CREATE TABLE IF NOT EXISTS bonds (
//        id BIGINT AUTO_INCREMENT PRIMARY KEY,
//        symbol VARCHAR(20) NOT NULL UNIQUE,
//issuer VARCHAR(100) NOT NULL,
//face_value DECIMAL(15, 2) NOT NULL,
//coupon_rate DECIMAL(5, 2) NOT NULL,
//maturity_date DATE NOT NULL
//);
public record Bond(Long id, String symbol, String issuer, BigDecimal faceValue, BigDecimal couponRate, LocalDate maturityDate) {
}
