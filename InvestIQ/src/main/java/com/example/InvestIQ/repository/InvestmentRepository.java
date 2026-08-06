package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Investment;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface InvestmentRepository {
    Optional<Investment> findById(Long investmentId);
    List<Investment> findByUserId(Long userId);
    List<Investment> findByPortfolioId(Long portfolioId);
    List<Investment> findByPortfolioIdAndAssetType(Long portfolioId, String assetType);

    Investment save(Investment newInvestment);
    Optional<Investment> update(Long investmentId, Investment investment);
    void deleteById(Long investmentId);
}

