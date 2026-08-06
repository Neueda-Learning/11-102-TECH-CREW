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

	/**
	 * Intraday price history for any symbol.
	 * interval: "1min" | "5min" | "15min" | "30min" | "60min"
	 * Returns ~100 data points keyed by timestamp.
	 */
	@SuppressWarnings("unchecked")
	public Optional<Map<String, Object>> fetchPriceHistory(String symbol, String interval) {
		String normalizedSymbol = normalizeSymbol(symbol);
		if (normalizedSymbol == null) {
			return Optional.empty();
		}

		String safeInterval = normalizeInterval(interval);
		String effectiveApiKey = resolveApiKey();
		if (effectiveApiKey == null) {
			return Optional.empty();
		}

		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.queryParam("function", "TIME_SERIES_INTRADAY")
				.queryParam("symbol", normalizedSymbol)
				.queryParam("interval", safeInterval)
				.queryParam("outputsize", "compact")
				.queryParam("apikey", effectiveApiKey)
				.toUriString();

		Map<String, Object> response = restTemplate.getForObject(url, Map.class);
		if (response == null || response.isEmpty()) {
			return Optional.empty();
		}

		// Some Alpha Vantage keys do not include intraday history (premium-only).
		// In that case, fall back to daily history so frontend still gets chart data.
		if (isIntradayPremiumBlocked(response)) {
			Optional<Map<String, Object>> daily = fetchDailyHistory(normalizedSymbol, effectiveApiKey);
			return daily.isPresent() ? daily : Optional.of(response);
		}

		if (hasApiError(response)) {
			return Optional.of(response);
		}

		String timeSeriesKey = "Time Series (" + safeInterval + ")";
		Object timeSeries = response.get(timeSeriesKey);
		if (!(timeSeries instanceof Map<?, ?> tsMap) || tsMap.isEmpty()) {
			return Optional.of(response);
		}

		return Optional.of((Map<String, Object>) tsMap);
	}

	@SuppressWarnings("unchecked")
	private Optional<Map<String, Object>> fetchDailyHistory(String normalizedSymbol, String effectiveApiKey) {
		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.queryParam("function", "TIME_SERIES_DAILY")
				.queryParam("symbol", normalizedSymbol)
				.queryParam("outputsize", "compact")
				.queryParam("apikey", effectiveApiKey)
				.toUriString();

		Map<String, Object> response = restTemplate.getForObject(url, Map.class);
		if (response == null || response.isEmpty() || hasApiError(response)) {
			return Optional.empty();
		}

		Object timeSeries = response.get("Time Series (Daily)");
		if (!(timeSeries instanceof Map<?, ?> tsMap) || tsMap.isEmpty()) {
			return Optional.empty();
		}

		return Optional.of((Map<String, Object>) tsMap);
	}

	private Map<String, Object> callApi(String function, String symbol) {
		String normalizedSymbol = normalizeSymbol(symbol);
		String effectiveApiKey = resolveApiKey();
		if (normalizedSymbol == null || effectiveApiKey == null) {
			return Collections.emptyMap();
		}

		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.queryParam("function", function)
				.queryParam("symbol", normalizedSymbol)
				.queryParam("apikey", effectiveApiKey)
				.toUriString();

		Map<String, Object> response = restTemplate.getForObject(url, Map.class);
		return response != null ? response : Collections.emptyMap();
	}

	private String normalizeSymbol(String symbol) {
		if (symbol == null || symbol.isBlank()) {
			return null;
		}
		return symbol.trim().toUpperCase();
	}

	private String normalizeInterval(String interval) {
		if (interval == null || interval.isBlank()) {
			return "5min";
		}
		String safeInterval = interval.trim().toLowerCase();
		if ("1min".equals(safeInterval)
				|| "5min".equals(safeInterval)
				|| "15min".equals(safeInterval)
				|| "30min".equals(safeInterval)
				|| "60min".equals(safeInterval)) {
			return safeInterval;
		}
		return "5min";
	}

	private String resolveApiKey() {
		if (apiKey == null || apiKey.isBlank() || apiKey.contains("YOUR_ALPHA_VANTAGE_API_KEY")) {
			// Fallback to demo key so /history works immediately for IBM in local testing.
			return "demo";
		}
		return apiKey.trim();
	}

	private boolean hasApiError(Map<String, Object> response) {
		return response.containsKey("Error Message") || response.containsKey("Information") || response.containsKey("Note");
	}

	private boolean isIntradayPremiumBlocked(Map<String, Object> response) {
		Object info = response.get("Information");
		if (info == null) {
			return false;
		}
		String message = info.toString().toLowerCase();
		return message.contains("premium endpoint") || message.contains("subscribe");
	}
}
