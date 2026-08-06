package com.example.InvestIQ.controller;

import com.example.InvestIQ.model.Transaction;
import com.example.InvestIQ.service.TransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class TransactionControllerTest {
    @Mock
    private TransactionService transactionService;

    @InjectMocks
    private TransactionController transactionController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(transactionController).build();
    }

    @Test
    void testGetTransactionsByPortfolioId() throws Exception {
        Transaction transaction = new Transaction(
                10L,
                1L,
                "AAPL",
                "STOCK",
                "BUY",
                5,
                new BigDecimal("195.42"),
                LocalDateTime.of(2026, 8, 6, 10, 30)
        );

        when(transactionService.getTransactionsByPortfolioId(1L)).thenReturn(List.of(transaction));

        mockMvc.perform(get("/transactions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].portfolio_id").value(1))
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[0].transactionType").value("BUY"));

        verify(transactionService).getTransactionsByPortfolioId(1L);
    }

    @Test
    void testGetTransactionsByPortfolioIdNotFound() throws Exception {
        when(transactionService.getTransactionsByPortfolioId(999L)).thenReturn(List.of());
        mockMvc.perform(get("/transactions/999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

    }

}
