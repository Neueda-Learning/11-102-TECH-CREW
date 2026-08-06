package com.example.InvestIQ.controller;

import com.example.InvestIQ.service.AlphaVantageService;
import com.example.InvestIQ.service.MarketDataService;
import com.example.InvestIQ.service.TwelveDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/market")
public class MarketDataController {

	private final MarketDataService marketDataService;
	private final AlphaVantageService alphaVantageService;
	private final TwelveDataService twelveDataService;

	public MarketDataController(MarketDataService marketDataService,
								AlphaVantageService alphaVantageService,
								TwelveDataService twelveDataService) {
		this.marketDataService = marketDataService;
		this.alphaVantageService = alphaVantageService;
		this.twelveDataService = twelveDataService;
	}

	// ── Existing endpoint (unchanged) ──────────────────────────────────────────
	@GetMapping("/stocks/{symbol}")
	public ResponseEntity<Map<String, Object>> getStockQuote(@PathVariable String symbol) {
        System.out.println("Fetching stock quote for symbol: " + symbol);
		return marketDataService.fetchStockQuote(symbol)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	// ── Live current price for any symbol (stock, bond, commodity) ─────────────
	// GET /market/quote/AAPL   or   /market/quote/XAUUSD   or   /market/quote/US10Y
	@GetMapping("/quote/{symbol}")
	public ResponseEntity<Map<String, Object>> getCurrentPrice(@PathVariable String symbol) {
		return alphaVantageService.fetchGlobalQuote(symbol)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	// ── Intraday price history (for charts) ────────────────────────────────────
	// GET /market/history/AAPL?interval=5min
	// interval: 1min | 5min | 15min | 30min | 60min  (default: 5min)
	@GetMapping("/history/{symbol}")
	public ResponseEntity<Map<String, Object>> getPriceHistory(
			@PathVariable String symbol,
			@RequestParam(defaultValue = "5min") String interval) {
		return twelveDataService.fetchPriceHistory(symbol, interval)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}
}
