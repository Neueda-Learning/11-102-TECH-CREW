package com.example.InvestIQ.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TwelveDataService {

	private final RestTemplate restTemplate;

	@Value("${twelve.data.base-url:https://api.twelvedata.com}")
	private String baseUrl;

	@Value("${twelve.data.api-key:}")
	private String apiKey;

	public TwelveDataService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	@SuppressWarnings("unchecked")
	public Optional<Map<String, Object>> fetchPriceHistory(String symbol, String interval) {
		String normalizedSymbol = normalizeSymbol(symbol);
		String safeInterval = normalizeInterval(interval);
		if (normalizedSymbol == null || apiKey == null || apiKey.isBlank()) {
			return Optional.empty();
		}

		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.path("/time_series")
				.queryParam("symbol", normalizedSymbol)
				.queryParam("interval", safeInterval)
				.queryParam("outputsize", 100)
				.queryParam("apikey", apiKey.trim())
				.toUriString();

		Map<String, Object> response = restTemplate.getForObject(url, Map.class);
		if (response == null || response.isEmpty()) {
			return Optional.empty();
		}

		Object status = response.get("status");
		if (status != null && "error".equalsIgnoreCase(String.valueOf(status))) {
			return Optional.empty();
		}

		Object valuesObject = response.get("values");
		if (!(valuesObject instanceof List<?> values) || values.isEmpty()) {
			return Optional.empty();
		}

		Map<String, Object> normalizedSeries = new LinkedHashMap<>();
		for (int i = values.size() - 1; i >= 0; i--) {
			Object item = values.get(i);
			if (!(item instanceof Map<?, ?> point)) {
				continue;
			}
			Object datetime = point.get("datetime");
			if (datetime == null) {
				continue;
			}

			Map<String, Object> ohlc = new LinkedHashMap<>();
			ohlc.put("1. open", point.get("open"));
			ohlc.put("2. high", point.get("high"));
			ohlc.put("3. low", point.get("low"));
			ohlc.put("4. close", point.get("close"));
			ohlc.put("5. volume", point.get("volume"));
			normalizedSeries.put(String.valueOf(datetime), ohlc);
		}

		if (normalizedSeries.isEmpty()) {
			return Optional.empty();
		}
		return Optional.of(normalizedSeries);
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
		if ("60min".equals(safeInterval)) {
			return "1h";
		}
		if ("1min".equals(safeInterval)
				|| "5min".equals(safeInterval)
				|| "15min".equals(safeInterval)
				|| "30min".equals(safeInterval)
				|| "1h".equals(safeInterval)) {
			return safeInterval;
		}
		return "5min";
	}
}

