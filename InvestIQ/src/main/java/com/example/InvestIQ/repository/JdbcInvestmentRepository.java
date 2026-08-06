package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Investment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository

public class JdbcInvestmentRepository implements InvestmentRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcInvestmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }


    private final RowMapper<Investment> investmentRowMapper = (rs, rowNum) -> new Investment(
            rs.getLong("id"),
            rs.getLong("portfolio_id"),
            rs.getString("symbol"),
            rs.getString("asset_type"),
            rs.getInt("quantity"),
            rs.getBigDecimal("purchase_price"),
            rs.getObject("purchase_date", java.time.LocalDate.class)
    );

    @Override
    public Optional<Investment> findById(Long investmentId) {
        return jdbcTemplate.query("SELECT * FROM investments WHERE id = ?", investmentRowMapper, investmentId)
                .stream()
                .findFirst();
    }

    @Override
    public List<Investment> findByUserId(Long userId) {
        String sql = "SELECT i.* FROM investments i " +
                "JOIN portfolios p ON i.portfolio_id = p.id " +
                "WHERE p.user_id = ?";
        return jdbcTemplate.query(sql, investmentRowMapper, userId);
    }

    @Override
    public List<Investment> findByPortfolioId(Long portfolioId) {
        String sql = "SELECT * FROM investments WHERE portfolio_id = ?";
        return jdbcTemplate.query(sql, investmentRowMapper, portfolioId);
    }

    @Override
    public List<Investment> findByPortfolioIdAndAssetType(Long portfolioId, String assetType) {
        String sql = "SELECT * FROM investments WHERE portfolio_id = ? AND asset_type = ?";
        return jdbcTemplate.query(sql, investmentRowMapper, portfolioId, assetType);
    }

    @Override
    public Investment save(Investment newInvestment) {
        String sql = "INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(sql,
                newInvestment.portfolio_id(),
                newInvestment.symbol(),
                newInvestment.assetType(),
                newInvestment.quantity(),
                newInvestment.purchasePrice(),
                newInvestment.purchaseDate());

        // Retrieve the newly created investment
        String retrieveSql = "SELECT * FROM investments WHERE portfolio_id = ? AND symbol = ? AND asset_type = ? ORDER BY id DESC LIMIT 1";
        return jdbcTemplate.queryForObject(retrieveSql, investmentRowMapper,
                newInvestment.portfolio_id(),
                newInvestment.symbol(),
                newInvestment.assetType());
    }

    @Override
    public Optional<Investment> update(Long investmentId, Investment investment) {
        String sql = "UPDATE investments SET portfolio_id = ?, symbol = ?, asset_type = ?, quantity = ?, purchase_price = ?, purchase_date = ? WHERE id = ?";
        int rowsAffected = jdbcTemplate.update(sql,
                investment.portfolio_id(),
                investment.symbol(),
                investment.assetType(),
                investment.quantity(),
                investment.purchasePrice(),
                investment.purchaseDate(),
                investmentId);

        if (rowsAffected > 0) {
            return findById(investmentId);
        }
        return Optional.empty();
    }

    @Override
    public void deleteById(Long investmentId) {
        jdbcTemplate.update("DELETE FROM investments WHERE id = ?", investmentId);
    }
}

