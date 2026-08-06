package com.example.InvestIQ.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Service
public class AlphaVantageService {

	private final RestTemplate restTemplate;

	@Value("${alpha.vantage.base-url:https://www.alphavantage.co/query}")
	private String baseUrl;

	@Value("${alpha.vantage.api-key:}")
	private String apiKey;

	public AlphaVantageService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public Optional<Map<String, Object>> fetchCompanyOverview(String symbol) {
		Map<String, Object> response = callApi("OVERVIEW", symbol);
		if (response.isEmpty() || hasApiError(response) || !response.containsKey("Symbol")) {
			return Optional.empty();
		}
		return Optional.of(response);
	}

	public Optional<Map<String, Object>> fetchGlobalQuote(String symbol) {
		Map<String, Object> response = callApi("GLOBAL_QUOTE", symbol);
		if (hasApiError(response)) {
			return Optional.empty();
		}

		Object quoteObject = response.get("Global Quote");
		if (!(quoteObject instanceof Map<?, ?> quoteMap) || quoteMap.isEmpty()) {
			return Optional.empty();
		}

		@SuppressWarnings("unchecked")
		Map<String, Object> quote = (Map<String, Object>) quoteMap;
		return Optional.of(quote);
	}

	private Map<String, Object> callApi(String function, String symbol) {
		if (symbol == null || symbol.isBlank() || apiKey == null || apiKey.isBlank()) {
			return Collections.emptyMap();
		}

		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.queryParam("function", function)
				.queryParam("symbol", symbol.trim().toUpperCase())
				.queryParam("apikey", apiKey)
				.toUriString();

		Map<String, Object> response = restTemplate.getForObject(url, Map.class);
		return response != null ? response : Collections.emptyMap();
	}

	private boolean hasApiError(Map<String, Object> response) {
		return response.containsKey("Error Message") || response.containsKey("Information") || response.containsKey("Note");
	}
}

