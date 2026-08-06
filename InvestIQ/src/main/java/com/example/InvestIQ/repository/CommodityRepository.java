package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Commodity;

import java.util.Optional;

public interface CommodityRepository {
    Optional<Commodity> findBySymbol(String symbol);
    Optional<Commodity> addCommodity(Commodity commodity);
}
