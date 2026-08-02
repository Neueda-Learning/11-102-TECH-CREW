package com.example.InvestIQ.repository;

import com.example.InvestIQ.entity.Bond;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BondRepository extends JpaRepository<Bond, Long> {
    Optional<Bond> findByIsin(String isin);
}

