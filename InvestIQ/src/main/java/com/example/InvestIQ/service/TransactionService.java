package com.example.InvestIQ.service;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.model.Transaction;
import com.example.InvestIQ.repository.InvestmentRepository;
import com.example.InvestIQ.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final InvestmentRepository investmentRepository;

    public TransactionService(TransactionRepository transactionRepository,
                              InvestmentRepository investmentRepository) {
        this.transactionRepository = transactionRepository;
        this.investmentRepository = investmentRepository;
    }

    public List<Transaction> getTransactionsByPortfolioId(Long portfolioId) {
        return transactionRepository.findByPortfolioId(portfolioId);
    }

    @Transactional
    public Transaction createTransaction(Long portfolioId, Transaction transaction) {
        validateTransactionInput(transaction);

        String symbol = transaction.symbol().trim().toUpperCase();
        String assetType = transaction.assetType().trim().toUpperCase();
        String transactionType = transaction.transactionType().trim().toUpperCase();

        Investment existing = investmentRepository.findByPortfolioId(portfolioId)
                .stream()
                .filter(i -> symbol.equalsIgnoreCase(i.symbol()) && assetType.equalsIgnoreCase(i.assetType()))
                .findFirst()
                .orElse(null);

        if ("BUY".equals(transactionType)) {
            applyBuy(portfolioId, symbol, assetType, transaction, existing);
        } else if ("SELL".equals(transactionType)) {
            applySell(transaction, existing);
        } else {
            throw new IllegalArgumentException("transactionType must be BUY or SELL");
        }

        Transaction normalizedTransaction = new Transaction(
                null,
                portfolioId,
                symbol,
                assetType,
                transactionType,
                transaction.quantity(),
                transaction.price(),
                LocalDateTime.now()
        );

        return transactionRepository.save(portfolioId, normalizedTransaction);
    }

    private void applyBuy(Long portfolioId,
                          String symbol,
                          String assetType,
                          Transaction transaction,
                          Investment existing) {
        if (existing == null) {
            Investment newInvestment = new Investment(
                    null,
                    portfolioId,
                    symbol,
                    assetType,
                    transaction.quantity(),
                    transaction.price(),
                    LocalDate.now()
            );
            investmentRepository.save(newInvestment);
            return;
        }

        int updatedQuantity = existing.quantity() + transaction.quantity();
        BigDecimal totalCost = existing.purchasePrice().multiply(BigDecimal.valueOf(existing.quantity()))
                .add(transaction.price().multiply(BigDecimal.valueOf(transaction.quantity())));
        BigDecimal averagePrice = totalCost.divide(BigDecimal.valueOf(updatedQuantity), 2, java.math.RoundingMode.HALF_UP);

        Investment updatedInvestment = new Investment(
                existing.id(),
                existing.portfolio_id(),
                existing.symbol(),
                existing.assetType(),
                updatedQuantity,
                averagePrice,
                existing.purchaseDate()
        );
        investmentRepository.update(existing.id(), updatedInvestment)
                .orElseThrow(() -> new IllegalStateException("Failed to update holding for BUY"));
    }

    private void applySell(Transaction transaction, Investment existing) {
        if (existing == null) {
            throw new IllegalArgumentException("Cannot sell an asset that is not in holdings");
        }
        if (transaction.quantity() > existing.quantity()) {
            throw new IllegalArgumentException("Sell quantity exceeds available holding quantity");
        }

        int updatedQuantity = existing.quantity() - transaction.quantity();
        if (updatedQuantity == 0) {
            investmentRepository.deleteById(existing.id());
            return;
        }

        Investment updatedInvestment = new Investment(
                existing.id(),
                existing.portfolio_id(),
                existing.symbol(),
                existing.assetType(),
                updatedQuantity,
                existing.purchasePrice(),
                existing.purchaseDate()
        );
        investmentRepository.update(existing.id(), updatedInvestment)
                .orElseThrow(() -> new IllegalStateException("Failed to update holding for SELL"));
    }

    private void validateTransactionInput(Transaction transaction) {
        if (transaction == null) {
            throw new IllegalArgumentException("Transaction payload is required");
        }
        if (transaction.symbol() == null || transaction.symbol().isBlank()) {
            throw new IllegalArgumentException("Symbol is required");
        }
        if (transaction.assetType() == null || transaction.assetType().isBlank()) {
            throw new IllegalArgumentException("Asset type is required");
        }
        if (transaction.transactionType() == null || transaction.transactionType().isBlank()) {
            throw new IllegalArgumentException("Transaction type is required");
        }
        if (transaction.quantity() == null || transaction.quantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }
        if (transaction.price() == null || transaction.price().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Price must be greater than zero");
        }
    }
}

