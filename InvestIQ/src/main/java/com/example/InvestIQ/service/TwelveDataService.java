package com.example.InvestIQ.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TwelveDataService {

	private final RestTemplate restTemplate;
	private final CurrencyLookupService currencyLookupService;

	@Value("${twelve.data.base-url:https://api.twelvedata.com}")
	private String baseUrl;

	@Value("${twelve.data.api-key:}")
	private String apiKey;

	public TwelveDataService(RestTemplate restTemplate, CurrencyLookupService currencyLookupService) {
		this.restTemplate = restTemplate;
		this.currencyLookupService = currencyLookupService;
	}

	public Optional<Map<String, Object>> fetchQuote(String symbol) {
		String normalizedSymbol = normalizeSymbol(symbol);
		if (normalizedSymbol == null || apiKey == null || apiKey.isBlank()) {
			return Optional.empty();
		}

		for (String candidate : quoteCandidates(normalizedSymbol)) {
			Optional<Map<String, Object>> quote = fetchQuoteForCandidate(normalizedSymbol, candidate);
			if (quote.isPresent()) {
				return quote;
			}
		}

		return Optional.empty();
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

		Object apiCurrency = null;
		Object metaObject = response.get("meta");
		if (metaObject instanceof Map<?, ?> metaMap) {
			apiCurrency = metaMap.get("currency");
		}
		Optional<String> resolvedCurrency = currencyLookupService.resolveCurrency(normalizedSymbol, apiCurrency);

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
			resolvedCurrency.ifPresent(currency -> ohlc.put("currency", currency));
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
		if ("daily".equals(safeInterval)) {
			return "1day";
		}
		if ("60min".equals(safeInterval)) {
			return "1h";
		}
		if ("1min".equals(safeInterval)
				|| "5min".equals(safeInterval)
				|| "15min".equals(safeInterval)
				|| "30min".equals(safeInterval)
				|| "1h".equals(safeInterval)
				|| "1day".equals(safeInterval)) {
			return safeInterval;
		}
		return "5min";
	}

	private Optional<Map<String, Object>> fetchQuoteForCandidate(String originalSymbol, String quoteSymbol) {
		String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
				.path("/quote")
				.queryParam("symbol", quoteSymbol)
				.queryParam("apikey", apiKey.trim())
				.toUriString();

		Map<String, Object> response;
		try {
			response = restTemplate.getForObject(url, Map.class);
		} catch (RestClientException ex) {
			return Optional.empty();
		}

		if (response == null || response.isEmpty()) {
			return Optional.empty();
		}

		Object status = response.get("status");
		if (status != null && "error".equalsIgnoreCase(String.valueOf(status))) {
			return Optional.empty();
		}

		Object close = response.get("close");
		if (close == null) {
			return Optional.empty();
		}

		Map<String, Object> normalized = new LinkedHashMap<>();
		normalized.put("01. symbol", response.getOrDefault("symbol", quoteSymbol));
		normalized.put("02. open", response.get("open"));
		normalized.put("03. high", response.get("high"));
		normalized.put("04. low", response.get("low"));
		normalized.put("05. price", close);
		normalized.put("06. volume", response.get("volume"));
		normalized.put("07. latest trading day", response.get("datetime"));
		normalized.put("08. previous close", response.get("previous_close"));
		normalized.put("09. change", response.get("change"));
		normalized.put("10. change percent", response.get("percent_change"));

		Object apiCurrency = response.get("currency");
		currencyLookupService.resolveCurrency(originalSymbol, apiCurrency)
				.ifPresent(currency -> normalized.put("currency", currency));

		return Optional.of(normalized);
	}

	private List<String> quoteCandidates(String symbol) {
		LinkedHashSet<String> candidates = new LinkedHashSet<>();
		candidates.add(symbol);

		if (symbol.matches("^[A-Z]{6}$")) {
			candidates.add(symbol.substring(0, 3) + "/" + symbol.substring(3));
		}

		return new ArrayList<>(candidates);
	}
}

