package com.example.InvestIQ.controller;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.service.InvestmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class InvestmentControllerTest {

    @Mock
    private InvestmentService investmentService;

    @InjectMocks
    private com.example.InvestIQ.controller.InvestmentController investmentController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(investmentController).build();
    }

    @Test
    void createInvestment_returnsSavedInvestment() throws Exception {
        Investment saved = new Investment(
                21L,
                1L,
                "AAPL",
                "STOCK",
                5,
                new BigDecimal("100.00"),
                LocalDate.of(2026, 1, 1)
        );

        when(investmentService.createInvestment(anyLong(), any(Investment.class))).thenReturn(saved);

        mockMvc.perform(post("/investments/portfolio/1")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleInvestment())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(21))
                .andExpect(jsonPath("$.symbol").value("AAPL"));
    }

    @Test
    void getInvestmentsByUserId_returnsList() throws Exception {
        when(investmentService.getInvestmentsByUserId(1L)).thenReturn(List.of(sampleInvestment()));

        mockMvc.perform(get("/investments/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[0].assetType").value("STOCK"));
    }

    private Investment sampleInvestment() {
        return new Investment(
                null,
                1L,
                "AAPL",
                "STOCK",
                5,
                new BigDecimal("100.00"),
                LocalDate.of(2026, 1, 1)
        );
    }
}


