package com.example.InvestIQ.controller;

import com.example.InvestIQ.service.AlphaVantageService;
import com.example.InvestIQ.service.CurrencyLookupService;
import com.example.InvestIQ.service.MarketDataService;
import com.example.InvestIQ.service.TwelveDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/market")
public class MarketDataController {

	private final MarketDataService marketDataService;
	private final AlphaVantageService alphaVantageService;
	private final TwelveDataService twelveDataService;
	private final CurrencyLookupService currencyLookupService;

	public MarketDataController(MarketDataService marketDataService,
								AlphaVantageService alphaVantageService,
								TwelveDataService twelveDataService,
								CurrencyLookupService currencyLookupService) {
		this.marketDataService = marketDataService;
		this.alphaVantageService = alphaVantageService;
		this.twelveDataService = twelveDataService;
		this.currencyLookupService = currencyLookupService;
	}

	// ── Existing endpoint (unchanged) ──────────────────────────────────────────
	@GetMapping("/stocks/{symbol}")
	public ResponseEntity<Map<String, Object>> getStockQuote(@PathVariable String symbol) {
        System.out.println("Fetching stock quote for symbol: " + symbol);
		return marketDataService.fetchStockQuote(symbol)
				.map(payload -> ResponseEntity.ok(withCurrency(symbol, payload)))
				.orElse(ResponseEntity.notFound().build());
	}

	// ── Live current price for any symbol (stock, bond, commodity) ─────────────
	// GET /market/quote/AAPL   or   /market/quote/XAUUSD   or   /market/quote/US10Y
	@GetMapping("/quote/{symbol}")
	public ResponseEntity<Map<String, Object>> getCurrentPrice(@PathVariable String symbol) {
		return twelveDataService.fetchQuote(symbol)
				.or(() -> alphaVantageService.fetchGlobalQuote(symbol))
				.map(payload -> ResponseEntity.ok(withCurrency(symbol, payload)))
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

	private Map<String, Object> withCurrency(String symbol, Map<String, Object> payload) {
		if (payload == null || payload.isEmpty()) {
			return payload;
		}

		Object existingCurrency = payload.get("currency");
		Optional<String> resolvedCurrency = currencyLookupService.resolveCurrency(symbol, existingCurrency);
		resolvedCurrency.ifPresent(currency -> payload.put("currency", currency));
		return payload;
	}
}
