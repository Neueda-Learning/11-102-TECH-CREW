package com.example.InvestIQ.controller;

import com.example.InvestIQ.service.MarketDataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class MarketDataControllerTest {
    @Mock
    private MarketDataService marketDataService;

    @InjectMocks
    private MarketDataController marketDataController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(marketDataController).build();
    }

    @Test
    void testGetMarketData() throws Exception {
        when(marketDataService.fetchStockQuote("AAPL"))
                .thenReturn(Optional.of(Map.of(
                        "symbol", "AAPL",
                        "price", 195.42
                )));

        mockMvc.perform(get("/market/stocks/AAPL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.price").value(195.42));
    }

    @Test
    void testGetMarketDataNotFound() throws Exception {
        when(marketDataService.fetchStockQuote("INVALID"))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/market/stocks/INVALID"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetMarketDataWithInvalidSymbol() throws Exception {
        mockMvc.perform(get("/market/stocks/"))
                .andExpect(status().isNotFound());
    }
}
