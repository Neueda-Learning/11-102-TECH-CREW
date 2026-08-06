package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.Bond;
import java.util.Optional;

public interface BondRepository {
    Optional<Bond> findBySymbol(String symbol);
    Optional<Bond> addBond(Bond bond);
}

