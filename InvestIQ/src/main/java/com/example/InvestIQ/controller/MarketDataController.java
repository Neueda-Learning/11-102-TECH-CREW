package com.example.InvestIQ.controller;

import com.example.InvestIQ.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/market")
public class MarketDataController {

	private final MarketDataService marketDataService;

	public MarketDataController(MarketDataService marketDataService) {
		this.marketDataService = marketDataService;
	}

	@GetMapping("/stocks/{symbol}")
	public ResponseEntity<Map<String, Object>> getStockQuote(@PathVariable String symbol) {
		return marketDataService.fetchStockQuote(symbol)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}


}

