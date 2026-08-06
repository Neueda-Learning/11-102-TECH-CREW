package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Commodity;
import com.example.InvestIQ.model.CommodityType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository

public class JdbcCommodityRepository implements CommodityRepository {

    private final JdbcTemplate jdbcTemplate;
    JdbcCommodityRepository(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }


    private final RowMapper<Commodity> commodityRowMapper = (rs, rowNum) -> new Commodity(
            rs.getLong("id"),
            rs.getString("symbol"),
            rs.getString("name"),
            CommodityType.valueOf(rs.getString("category")),
            rs.getString("unit"),
            rs.getBigDecimal("current_price"),
            rs.getBigDecimal("price_change"),
            rs.getBigDecimal("percent_change"),
            rs.getObject("last_updated", java.time.LocalDateTime.class)
    );
    @Override
    public Optional<Commodity> findBySymbol(String symbol) {
        // Implement JDBC logic to find a commodity by its symbol
        return jdbcTemplate.query("SELECT * FROM commodities WHERE symbol = ?", commodityRowMapper, symbol)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Commodity> addCommodity(Commodity commodity) {
        int rowsAffected = jdbcTemplate.update("INSERT INTO commodities (symbol, name, category, unit, current_price, price_change, percent_change) VALUES (?, ?, ?, ?, ?, ?, ?)",
                commodity.symbol(),
                commodity.name(),
                commodity.category().name(),
                commodity.unit(),
                commodity.currentPrice(),
                commodity.priceChange(),
                commodity.percentChange());
        if (rowsAffected > 0) {
            return findBySymbol(commodity.symbol());
        } else {
            return Optional.empty();
        }
    }
}
