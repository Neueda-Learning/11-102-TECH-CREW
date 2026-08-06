package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Bond;
import com.example.InvestIQ.model.Commodity;
import com.example.InvestIQ.model.CommodityType;
import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.model.StockQuote;
import com.example.InvestIQ.model.Transaction;
import com.example.InvestIQ.repository.BondRepository;
import com.example.InvestIQ.repository.CommodityRepository;
import com.example.InvestIQ.repository.InvestmentRepository;
import com.example.InvestIQ.repository.StockQuoteRepository;
import com.example.InvestIQ.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class InvestmentService {

    private final InvestmentRepository investmentRepository;
    private final StockQuoteRepository stockQuoteRepository;
    private final BondRepository bondRepository;
    private final CommodityRepository commodityRepository;
    private final AlphaVantageService alphaVantageService;
    private final TransactionRepository transactionRepository;

    public InvestmentService(InvestmentRepository investmentRepository,
                             StockQuoteRepository stockQuoteRepository,
                             BondRepository bondRepository,
                             CommodityRepository commodityRepository,
                             AlphaVantageService alphaVantageService,
                             TransactionRepository transactionRepository) {
        this.investmentRepository = investmentRepository;
        this.stockQuoteRepository = stockQuoteRepository;
        this.bondRepository = bondRepository;
        this.commodityRepository = commodityRepository;
        this.alphaVantageService = alphaVantageService;
        this.transactionRepository = transactionRepository;
    }

    public List<Investment> getInvestmentsByUserId(Long userId) {
        return investmentRepository.findByUserId(userId);
    }

    public Investment getInvestmentById(Long investmentId) {
        return investmentRepository.findById(investmentId).orElse(null);
    }

    public List<Investment> getInvestmentsByPortfolioId(Long portfolioId) {
        return investmentRepository.findByPortfolioId(portfolioId);
    }

    public Investment updateInvestment(Long investmentId, Investment investment) {
        Investment updated = investmentRepository.findById(investmentId)
                .map(existingInvestment -> new Investment(
                        existingInvestment.id(),
                        investment.portfolio_id() != null ? investment.portfolio_id() : existingInvestment.portfolio_id(),
                        investment.symbol() != null ? investment.symbol() : existingInvestment.symbol(),
                        investment.assetType() != null ? investment.assetType() : existingInvestment.assetType(),
                        investment.quantity() != null ? investment.quantity() : existingInvestment.quantity(),
                        investment.purchasePrice() != null ? investment.purchasePrice() : existingInvestment.purchasePrice(),
                        investment.purchaseDate() != null ? investment.purchaseDate() : existingInvestment.purchaseDate()
                ))
                .orElse(null);

        if (updated == null) {
            return null;
        }
        return investmentRepository.update(investmentId, updated).orElse(null);
    }

    @Transactional
    public Investment createInvestment(Long portfolioId, Investment investment) {
        String normalizedSymbol = normalizeSymbol(investment.symbol());
        String normalizedAssetType = normalizeAssetType(investment.assetType());
        validateQuantityAndPrice(investment.quantity(), investment.purchasePrice());

        Map<String, Object> overview = alphaVantageService.fetchCompanyOverview(normalizedSymbol)
                .orElseThrow(() -> new IllegalArgumentException("Unable to fetch overview for symbol: " + normalizedSymbol));

        Map<String, Object> globalQuote = alphaVantageService.fetchGlobalQuote(normalizedSymbol).orElse(Map.of());
        storeAssetMetadata(normalizedSymbol, normalizedAssetType, overview, globalQuote);

        LocalDate purchaseDate = investment.purchaseDate() != null ? investment.purchaseDate() : LocalDate.now();
        Investment savedInvestment = upsertHoldingOnBuy(
                portfolioId,
                normalizedSymbol,
                normalizedAssetType,
                investment.quantity(),
                investment.purchasePrice(),
                purchaseDate
        );

        transactionRepository.save(
                portfolioId,
                new Transaction(
                        null,
                        portfolioId,
                        normalizedSymbol,
                        normalizedAssetType,
                        "BUY",
                        investment.quantity(),
                        investment.purchasePrice(),
                        LocalDateTime.now()
                )
        );

        return savedInvestment;
    }

    private Investment upsertHoldingOnBuy(Long portfolioId,
                                          String symbol,
                                          String assetType,
                                          Integer quantity,
                                          BigDecimal purchasePrice,
                                          LocalDate purchaseDate) {
        Investment existing = investmentRepository.findByPortfolioId(portfolioId)
                .stream()
                .filter(i -> symbol.equalsIgnoreCase(i.symbol()) && assetType.equalsIgnoreCase(i.assetType()))
                .findFirst()
                .orElse(null);

        if (existing == null) {
            Investment newInvestment = new Investment(
                    null,
                    portfolioId,
                    symbol,
                    assetType,
                    quantity,
                    purchasePrice,
                    purchaseDate
            );
            return investmentRepository.save(newInvestment);
        }

        int updatedQuantity = existing.quantity() + quantity;
        BigDecimal totalCost = existing.purchasePrice().multiply(BigDecimal.valueOf(existing.quantity()))
                .add(purchasePrice.multiply(BigDecimal.valueOf(quantity)));
        BigDecimal averagePrice = totalCost.divide(BigDecimal.valueOf(updatedQuantity), 2, java.math.RoundingMode.HALF_UP);

        Investment updatedInvestment = new Investment(
                existing.id(),
                existing.portfolio_id(),
                existing.symbol(),
                existing.assetType(),
                updatedQuantity,
                averagePrice,
                purchaseDate
        );
        return investmentRepository.update(existing.id(), updatedInvestment)
                .orElseThrow(() -> new IllegalStateException("Failed to update existing holding"));
    }

    private void storeAssetMetadata(String symbol,
                                    String assetType,
                                    Map<String, Object> overview,
                                    Map<String, Object> globalQuote) {
        switch (assetType) {
            case "STOCK" -> addStockIfMissing(symbol, overview, globalQuote);
            case "BOND" -> addBondIfMissing(symbol, overview);
            case "COMMODITY" -> addCommodityIfMissing(symbol, overview, globalQuote);
            default -> throw new IllegalArgumentException("Unsupported asset type: " + assetType);
        }
    }

    private void addStockIfMissing(String symbol, Map<String, Object> overview, Map<String, Object> globalQuote) {
        if (stockQuoteRepository.findBySymbol(symbol).isPresent()) {
            return;
        }

        StockQuote stockQuote = new StockQuote(
                null,
                symbol,
                readCurrency(overview),
                readString(overview, "Name", symbol),
                readBigDecimal(globalQuote, "05. price", BigDecimal.ZERO),
                readBigDecimal(globalQuote, "09. change", BigDecimal.ZERO),
                readPercent(globalQuote, "10. change percent"),
                readBigDecimal(globalQuote, "08. previous close", BigDecimal.ZERO),
                readBigDecimal(globalQuote, "03. high", BigDecimal.ZERO),
                readBigDecimal(globalQuote, "04. low", BigDecimal.ZERO),
                LocalDateTime.now()
        );
        stockQuoteRepository.addStockQuote(stockQuote);
    }

    private void addBondIfMissing(String symbol, Map<String, Object> overview) {
        if (bondRepository.findBySymbol(symbol).isPresent()) {
            return;
        }

        Bond bond = new Bond(
                null,
                symbol,
                readCurrency(overview),
                readString(overview, "Name", "Unknown Issuer"),
                readBigDecimal(overview, "BookValue", BigDecimal.ZERO),
                readBigDecimal(overview, "DividendYield", BigDecimal.ZERO),
                LocalDate.now().plusYears(10)
        );
        bondRepository.addBond(bond);
    }

    private void addCommodityIfMissing(String symbol,
                                       Map<String, Object> overview,
                                       Map<String, Object> globalQuote) {
        if (commodityRepository.findBySymbol(symbol).isPresent()) {
            return;
        }

        String name = readString(overview, "Name", symbol);
        Commodity commodity = new Commodity(
                null,
                symbol,
                name,
                readCurrency(overview),
                inferCommodityType(symbol, name),
                "UNIT",
                readBigDecimal(globalQuote, "05. price", BigDecimal.ZERO),
                readBigDecimal(globalQuote, "09. change", BigDecimal.ZERO),
                readPercent(globalQuote, "10. change percent"),
                LocalDateTime.now()
        );
        commodityRepository.addCommodity(commodity);
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("Symbol is required");
        }
        return symbol.trim().toUpperCase();
    }

    private String normalizeAssetType(String assetType) {
        if (assetType == null || assetType.isBlank()) {
            throw new IllegalArgumentException("Asset type is required");
        }
        return assetType.trim().toUpperCase();
    }

    private void validateQuantityAndPrice(Integer quantity, BigDecimal purchasePrice) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }
        if (purchasePrice == null || purchasePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Purchase price must be greater than zero");
        }
    }

    private String readString(Map<String, Object> map, String key, String fallback) {
        Object value = map.get(key);
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return text.isEmpty() || "None".equalsIgnoreCase(text) ? fallback : text;
    }

    private BigDecimal readBigDecimal(Map<String, Object> map, String key, BigDecimal fallback) {
        Object value = map.get(key);
        if (value == null) {
            return fallback;
        }

        String text = value.toString().trim();
        if (text.isEmpty() || "None".equalsIgnoreCase(text)) {
            return fallback;
        }

        try {
            return new BigDecimal(text);
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String readCurrency(Map<String, Object> overview) {
        return readString(overview, "Currency", "USD");
    }

    private BigDecimal readPercent(Map<String, Object> map, String key) {
        Object rawValue = map.get(key);
        if (rawValue == null) {
            return BigDecimal.ZERO;
        }

        String normalized = rawValue.toString().replace("%", "").trim();
        if (normalized.isEmpty()) {
            return BigDecimal.ZERO;
        }

        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }

    private CommodityType inferCommodityType(String symbol, String name) {
        String text = (symbol + " " + name).toUpperCase();
        if (text.contains("GOLD") || text.contains("XAU")) {
            return CommodityType.GOLD;
        }
        if (text.contains("SILVER") || text.contains("XAG")) {
            return CommodityType.SILVER;
        }
        if (text.contains("PLATINUM") || text.contains("XPT")) {
            return CommodityType.PLATINUM;
        }
        return CommodityType.OIL;
    }
}

