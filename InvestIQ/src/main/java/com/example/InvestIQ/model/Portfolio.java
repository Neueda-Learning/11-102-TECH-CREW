package com.example.InvestIQ.model;

import java.time.LocalDateTime;

public record Portfolio(Long id, Long user_id, String name, String description, LocalDateTime createdAt) {
}
