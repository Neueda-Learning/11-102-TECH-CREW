package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.StockQuote;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository

public class JdbcStockQuoteRepository implements StockQuoteRepository{
    private final JdbcTemplate jdbcTemplate;
    JdbcStockQuoteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
//    id BIGINT AUTO_INCREMENT PRIMARY KEY,
//    symbol VARCHAR(10) NOT NULL UNIQUE,
//    company_name VARCHAR(100),
//    current_price DECIMAL(10, 2) NOT NULL,
//    price_change DECIMAL(10, 2),
//    percent_change DECIMAL(5, 2),
//    previous_close DECIMAL(10, 2),
//    day_high DECIMAL(10, 2),
//    day_low DECIMAL(10, 2),
//    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

    private final RowMapper<StockQuote> stockQuoteRowMapper=(rs, rownum)->new StockQuote(
            rs.getLong("id"),
            rs.getString("symbol"),
            rs.getString("company_name"),
            rs.getBigDecimal("current_price"),
            rs.getBigDecimal("price_change"),
            rs.getBigDecimal("percent_change"),
            rs.getBigDecimal("previous_close"),
            rs.getBigDecimal("day_high"),
            rs.getBigDecimal("day_low"),
            rs.getObject("last_updated", java.time.LocalDateTime.class)
    );

    @Override
    public Optional<StockQuote> findBySymbol(String symbol) {
        return jdbcTemplate.query("SELECT * FROM stock_quotes WHERE symbol = ?", stockQuoteRowMapper, symbol)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<StockQuote> addStockQuote(StockQuote stockQuote) {
        return jdbcTemplate.update("INSERT INTO stock_quotes (symbol, company_name, current_price, price_change, percent_change, previous_close, day_high, day_low) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                stockQuote.symbol(),
                stockQuote.companyName(),
                stockQuote.currentPrice(),
                stockQuote.priceChange(),
                stockQuote.percentChange(),
                stockQuote.previousClose(),
                stockQuote.dayHigh(),
                stockQuote.dayLow()) > 0 ? Optional.of(stockQuote) : Optional.empty();
    }
}
