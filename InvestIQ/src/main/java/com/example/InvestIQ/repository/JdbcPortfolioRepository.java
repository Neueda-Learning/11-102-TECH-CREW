package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Portfolio;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository

public class JdbcPortfolioRepository implements PortfolioRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPortfolioRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Portfolio> portfolioRowMapper = (rs, rowNum) -> new Portfolio(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getObject("created_at", LocalDateTime.class)
    );


    @Override
    public Portfolio createPortfolio(Long userId, Portfolio portfolio) {
        String sql = "INSERT INTO portfolios (user_id, name, description, created_at) VALUES (?, ?, ?, ?)";
        String defaultName = "New Portfolio";
        String defaultDescription = "This is a new portfolio.";
        String name = portfolio != null && portfolio.name() != null && !portfolio.name().isBlank()
                ? portfolio.name()
                : defaultName;
        String description = portfolio != null && portfolio.description() != null && !portfolio.description().isBlank()
                ? portfolio.description()
                : defaultDescription;
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.update(sql, userId, name, description, now);

        // Retrieve the newly created portfolio
        String retrieveSql = "SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC LIMIT 1";
        return jdbcTemplate.queryForObject(retrieveSql, portfolioRowMapper, userId);
    }

    @Override
    public List<Portfolio> getPortfolioByUserId(Long userId) {
        String sql = "SELECT * FROM portfolios WHERE user_id = ?";
        return jdbcTemplate.query(sql, portfolioRowMapper, userId);
    }

    @Override
    public Optional<Portfolio> getPortfolioById(Long portfolioId) {
        String sql = "SELECT * FROM portfolios WHERE id = ?";
        return jdbcTemplate.query(sql, portfolioRowMapper, portfolioId)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Portfolio> updatePortfolio(Long portfolioId, Portfolio portfolio) {
        String sql = "UPDATE portfolios SET name = ?, description = ? WHERE id = ?";
        int rowsAffected = jdbcTemplate.update(sql, portfolio.name(), portfolio.description(), portfolioId);
        if (rowsAffected > 0) {
            return getPortfolioById(portfolioId);
        } else {
            return Optional.empty();
        }
    }

    @Override
    public void deletePortfolioById(Long portfolioId) {
        String sql = "DELETE FROM portfolios WHERE id = ?";
        jdbcTemplate.update(sql, portfolioId);
    }
}

