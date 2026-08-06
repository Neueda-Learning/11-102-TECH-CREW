package com.example.InvestIQ.controller;

import com.example.InvestIQ.entity.Portfolio;
import com.example.InvestIQ.entity.User;
import com.example.InvestIQ.service.PortfolioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PortfolioControllerTest {

    @Mock
    private PortfolioService portfolioService;

    @InjectMocks
    private com.example.InvestIQ.controller.PortfolioController portfolioController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(portfolioController).build();
    }

    @Test
    void createPortfolio_returnsSavedPortfolio() throws Exception {
        User user = new User();
        user.setId(1L);

        Portfolio saved = new Portfolio();
        saved.setId(11L);
        saved.setName("Growth");
        saved.setUser(user); //user ->User

        when(portfolioService.createPortfolio(any(Long.class), any(Portfolio.class))).thenReturn(saved);

        Portfolio request = new Portfolio();
        request.setName("Growth");

        mockMvc.perform(post("/portfolios/user/1")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.name").value("Growth"));
    }

    @Test
    void getPortfolioByUserId_returnsList() throws Exception {
        Portfolio portfolio = new Portfolio();
        portfolio.setId(12L);
        portfolio.setName("Income");

        when(portfolioService.getPortfolioByUserId(1L)).thenReturn(List.of(portfolio));

        mockMvc.perform(get("/portfolios/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(12))
                .andExpect(jsonPath("$[0].name").value("Income"));
    }
}

