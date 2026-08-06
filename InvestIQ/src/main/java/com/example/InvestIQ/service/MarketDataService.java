package com.example.InvestIQ.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Service
public class MarketDataService {

	private final RestTemplate restTemplate;

	@Value("${market.api.url:https://finnhub.io/api/v1}")
	private String apiUrl;

	@Value("${market.api.key:}")
	private String apiKey;

	public MarketDataService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public Optional<Map<String, Object>> fetchStockQuote(String symbol) {
		try {
			String normalizedSymbol = symbol.trim().toUpperCase();
			String quoteUrl = apiUrl + "/quote?symbol=" + normalizedSymbol + "&token=" + apiKey;
			System.out.println("[MarketDataService] Calling URL: " + quoteUrl);
			Map<String, Object> quoteResponse = restTemplate.getForObject(quoteUrl, Map.class);
			System.out.println("[MarketDataService] API Response: " + quoteResponse);
			return Optional.ofNullable(quoteResponse);
		} catch (Exception ignored) {
			System.out.println("[MarketDataService] API Call Failed for symbol: " + symbol);
			return Optional.empty();
		}
	}
}


