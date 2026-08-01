package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {
    List<Investment> findBySymbol(String symbol);
}

