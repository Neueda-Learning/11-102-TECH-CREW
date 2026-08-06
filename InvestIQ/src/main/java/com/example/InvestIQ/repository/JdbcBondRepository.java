package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Bond;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class JdbcBondRepository implements BondRepository {
    private final JdbcTemplate jdbcTemplate;

    JdbcBondRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
//    CREATE TABLE IF NOT EXISTS bonds (
//            id BIGINT AUTO_INCREMENT PRIMARY KEY,
//            symbol VARCHAR(20) NOT NULL UNIQUE,
//    issuer VARCHAR(100) NOT NULL,
//    face_value DECIMAL(15, 2) NOT NULL,
//    coupon_rate DECIMAL(5, 2) NOT NULL,
//    maturity_date DATE NOT NULL
//);

    private final RowMapper<Bond> bondRowMapper = (rs, rowNum) -> new Bond(
            rs.getLong("id"),
            rs.getString("symbol"),
            rs.getString("issuer"),
            rs.getBigDecimal("face_value"),
            rs.getBigDecimal("coupon_rate"),
            rs.getObject("maturity_date", java.time.LocalDate.class)
    );
    @Override
    public Optional<Bond> findBySymbol(String isin) {
        return jdbcTemplate.query("SELECT * FROM bonds WHERE symbol = ?", bondRowMapper, isin)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Bond> addBond(Bond bond) {
        int rowsAffected = jdbcTemplate.update("INSERT INTO bonds (symbol, issuer, face_value, coupon_rate, maturity_date) VALUES (?, ?, ?, ?, ?)",
                bond.symbol(),
                bond.issuer(),
                bond.faceValue(),
                bond.couponRate(),
                bond.maturityDate());
        if (rowsAffected > 0) {
            return findBySymbol(bond.symbol());
        } else {
            return Optional.empty();
        }
    }
}

