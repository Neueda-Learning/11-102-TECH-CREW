package com.example.InvestIQ.service;

import com.example.InvestIQ.repository.BondRepository;
import com.example.InvestIQ.repository.CommodityRepository;
import com.example.InvestIQ.repository.StockQuoteRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CurrencyLookupService {

	private final StockQuoteRepository stockQuoteRepository;
	private final BondRepository bondRepository;
	private final CommodityRepository commodityRepository;

	public CurrencyLookupService(StockQuoteRepository stockQuoteRepository,
								 BondRepository bondRepository,
								 CommodityRepository commodityRepository) {
		this.stockQuoteRepository = stockQuoteRepository;
		this.bondRepository = bondRepository;
		this.commodityRepository = commodityRepository;
	}

	public Optional<String> resolveCurrency(String symbol, Object apiCurrency) {
		String normalizedApiCurrency = normalizeCurrency(apiCurrency);
		if (normalizedApiCurrency != null) {
			return Optional.of(normalizedApiCurrency);
		}

		String normalizedSymbol = normalizeSymbol(symbol);
		if (normalizedSymbol == null) {
			return Optional.empty();
		}

		Optional<String> stockCurrency = stockQuoteRepository.findBySymbol(normalizedSymbol)
				.map(stock -> normalizeCurrency(stock.currency()));
		if (stockCurrency.isPresent() && stockCurrency.get() != null) {
			return Optional.of(stockCurrency.get());
		}

		Optional<String> bondCurrency = bondRepository.findBySymbol(normalizedSymbol)
				.map(bond -> normalizeCurrency(bond.currency()));
		if (bondCurrency.isPresent() && bondCurrency.get() != null) {
			return Optional.of(bondCurrency.get());
		}

		Optional<String> commodityCurrency = commodityRepository.findBySymbol(normalizedSymbol)
				.map(commodity -> normalizeCurrency(commodity.currency()));
		if (commodityCurrency.isPresent() && commodityCurrency.get() != null) {
			return Optional.of(commodityCurrency.get());
		}

		return Optional.empty();
	}

	private String normalizeSymbol(String symbol) {
		if (symbol == null || symbol.isBlank()) {
			return null;
		}
		return symbol.trim().toUpperCase();
	}

	private String normalizeCurrency(Object currencyValue) {
		if (currencyValue == null) {
			return null;
		}
		String raw = String.valueOf(currencyValue).trim().toUpperCase();
		if (raw.isEmpty()) {
			return null;
		}

		String lettersOnly = raw.replaceAll("[^A-Z]", "");
		if (lettersOnly.length() >= 3) {
			return lettersOnly.substring(0, 3);
		}
		return null;
	}
}

