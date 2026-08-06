package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Transaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class JdbcTransactionRepository implements TransactionRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcTransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /*
    CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(10) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

     */

    private final RowMapper<Transaction> transactionRowMapper = (rs, rowNum) -> new Transaction(
            rs.getLong("id"),
            rs.getLong("portfolio_id"),
            rs.getString("symbol"),
            rs.getString("asset_type"),
            rs.getString("transaction_type"),
            rs.getInt("quantity"),
            rs.getBigDecimal("price"),
            rs.getObject("transaction_date", java.time.LocalDateTime.class)
    );


    @Override
    public List<Transaction> findByPortfolioId(Long portfolioId) {
        return jdbcTemplate.query("SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY transaction_date DESC", transactionRowMapper, portfolioId);
    }

    @Override
    public Transaction save(Long portfolioId, Transaction transaction) {
        String sql = "INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price) VALUES (?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(sql, portfolioId, transaction.symbol(), transaction.assetType(), transaction.transactionType(), transaction.quantity(), transaction.price());

        // Retrieve the newly created transaction
        String retrieveSql = "SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY transaction_date DESC LIMIT 1";
        return jdbcTemplate.queryForObject(retrieveSql, transactionRowMapper, portfolioId);
    }
}

