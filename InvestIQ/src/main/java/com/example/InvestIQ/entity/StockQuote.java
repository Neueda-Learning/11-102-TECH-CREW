package com.example.InvestIQ.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_quotes")
public class StockQuote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String symbol;

    @Column(name = "company_name", length = 100)
    private String companyName;

    @Column(name = "current_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "price_change", precision = 10, scale = 2)
    private BigDecimal priceChange;

    @Column(name = "percent_change", precision = 5, scale = 2)
    private BigDecimal percentChange;

    @Column(name = "previous_close", precision = 10, scale = 2)
    private BigDecimal previousClose;

    @Column(name = "day_high", precision = 10, scale = 2)
    private BigDecimal dayHigh;

    @Column(name = "day_low", precision = 10, scale = 2)
    private BigDecimal dayLow;

    @Column(name = "last_updated", insertable = false, updatable = false)
    private LocalDateTime lastUpdated;

    public StockQuote() {
    }

    public StockQuote(Long id, String symbol, String companyName, BigDecimal currentPrice, BigDecimal priceChange,
                      BigDecimal percentChange, BigDecimal previousClose, BigDecimal dayHigh, BigDecimal dayLow,
                      LocalDateTime lastUpdated) {
        this.id = id;
        this.symbol = symbol;
        this.companyName = companyName;
        this.currentPrice = currentPrice;
        this.priceChange = priceChange;
        this.percentChange = percentChange;
        this.previousClose = previousClose;
        this.dayHigh = dayHigh;
        this.dayLow = dayLow;
        this.lastUpdated = lastUpdated;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getPriceChange() {
        return priceChange;
    }

    public void setPriceChange(BigDecimal priceChange) {
        this.priceChange = priceChange;
    }

    public BigDecimal getPercentChange() {
        return percentChange;
    }

    public void setPercentChange(BigDecimal percentChange) {
        this.percentChange = percentChange;
    }

    public BigDecimal getPreviousClose() {
        return previousClose;
    }

    public void setPreviousClose(BigDecimal previousClose) {
        this.previousClose = previousClose;
    }

    public BigDecimal getDayHigh() {
        return dayHigh;
    }

    public void setDayHigh(BigDecimal dayHigh) {
        this.dayHigh = dayHigh;
    }

    public BigDecimal getDayLow() {
        return dayLow;
    }

    public void setDayLow(BigDecimal dayLow) {
        this.dayLow = dayLow;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}

