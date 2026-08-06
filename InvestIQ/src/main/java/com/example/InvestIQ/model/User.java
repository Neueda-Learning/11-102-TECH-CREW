package com.example.InvestIQ.model;

import java.time.LocalDateTime;

public record User(Long id, String username, String email, String password, LocalDateTime createdAt) {

}
