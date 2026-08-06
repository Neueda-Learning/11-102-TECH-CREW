-- Seed users (unique on username/email)
INSERT IGNORE INTO users (username, email, password, created_at) VALUES
('alice', 'alice@example.com', 'alice@123', '2026-01-10 09:00:00'),
('bob', 'bob@example.com', 'bob@123', '2026-01-11 10:15:00'),
('charlie', 'charlie@example.com', 'charlie@123', '2026-01-12 11:30:00');

-- Seed portfolios with FK mapping to users
INSERT INTO portfolios (user_id, name, description, created_at)
SELECT u.id, 'Retirement Portfolio', 'Long-term retirement holdings', '2026-02-01 09:30:00'
FROM users u
WHERE u.username = 'alice'
  AND NOT EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = u.id AND p.name = 'Retirement Portfolio'
  );

INSERT INTO portfolios (user_id, name, description, created_at)
SELECT u.id, 'Short Term Portfolio', 'Swing and short-term opportunities', '2026-02-01 09:35:00'
FROM users u
WHERE u.username = 'alice'
  AND NOT EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = u.id AND p.name = 'Short Term Portfolio'
  );

INSERT INTO portfolios (user_id, name, description, created_at)
SELECT u.id, 'Growth Portfolio', 'High growth equity picks', '2026-02-02 10:00:00'
FROM users u
WHERE u.username = 'bob'
  AND NOT EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = u.id AND p.name = 'Growth Portfolio'
  );

INSERT INTO portfolios (user_id, name, description, created_at)
SELECT u.id, 'Income Portfolio', 'Dividend and coupon income focus', '2026-02-02 10:10:00'
FROM users u
WHERE u.username = 'bob'
  AND NOT EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = u.id AND p.name = 'Income Portfolio'
  );

INSERT INTO portfolios (user_id, name, description, created_at)
SELECT u.id, 'Commodities Hedge', 'Commodity positions for inflation hedge', '2026-02-03 08:45:00'
FROM users u
WHERE u.username = 'charlie'
  AND NOT EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = u.id AND p.name = 'Commodities Hedge'
  );

-- Seed stock quotes (unique on symbol)
INSERT IGNORE INTO stock_quotes (
    symbol, currency, company_name, current_price, price_change, percent_change,
    previous_close, day_high, day_low, last_updated
) VALUES
('AAPL', 'USD', 'Apple Inc.', 228.54, 1.34, 0.59, 227.20, 229.30, 226.70, '2026-08-06 09:45:00'),
('TSLA', 'USD', 'Tesla, Inc.', 249.12, -3.11, -1.23, 252.23, 253.10, 247.90, '2026-08-06 09:45:00'),
('MSFT', 'USD', 'Microsoft Corporation', 468.77, 2.02, 0.43, 466.75, 469.20, 465.90, '2026-08-06 09:45:00');

-- Seed bonds (unique on symbol)
INSERT IGNORE INTO bonds (symbol, currency, issuer, face_value, coupon_rate, maturity_date) VALUES
('US10Y', 'USD', 'US Treasury', 1000.00, 4.25, '2034-12-31'),
('CORP2029', 'USD', 'Acme Corporate Bond', 1000.00, 6.10, '2029-06-30'),
('MUNI2031', 'USD', 'Metro Municipal Bond', 5000.00, 4.75, '2031-09-15');

-- Seed commodities (unique on symbol)
INSERT IGNORE INTO commodities (
    symbol, name, currency, category, unit, current_price, price_change, percent_change, last_updated
) VALUES
('XAUUSD', 'Gold Spot', 'USD', 'GOLD', 'oz', 2450.50, 12.40, 0.51, '2026-08-06 09:45:00'),
('XAGUSD', 'Silver Spot', 'USD', 'SILVER', 'oz', 31.27, 0.18, 0.58, '2026-08-06 09:45:00'),
('XPTUSD', 'Platinum Spot', 'USD', 'PLATINUM', 'oz', 1042.85, -5.15, -0.49, '2026-08-06 09:45:00'),
('BRENT', 'Brent Crude Oil', 'USD', 'OIL', 'barrel', 84.65, 0.92, 1.10, '2026-08-06 09:45:00');

-- Seed investments with FK mapping to portfolios
INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'AAPL', 'STOCK', 15, 182.30, '2026-03-10'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Retirement Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'AAPL'
        AND i.asset_type = 'STOCK'
        AND i.purchase_date = '2026-03-10'
  );

INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'US10Y', 'BOND', 8, 980.00, '2026-03-15'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Retirement Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'US10Y'
        AND i.asset_type = 'BOND'
        AND i.purchase_date = '2026-03-15'
  );

INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'TSLA', 'STOCK', 12, 210.50, '2026-04-12'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Short Term Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'TSLA'
        AND i.asset_type = 'STOCK'
        AND i.purchase_date = '2026-04-12'
  );

INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'MSFT', 'STOCK', 20, 395.00, '2026-03-20'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'bob' AND p.name = 'Growth Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'MSFT'
        AND i.asset_type = 'STOCK'
        AND i.purchase_date = '2026-03-20'
  );

INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'CORP2029', 'BOND', 5, 1012.00, '2026-04-01'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'bob' AND p.name = 'Income Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'CORP2029'
        AND i.asset_type = 'BOND'
        AND i.purchase_date = '2026-04-01'
  );

INSERT INTO investments (portfolio_id, symbol, asset_type, quantity, purchase_price, purchase_date)
SELECT p.id, 'XAUUSD', 'COMMODITY', 6, 2210.00, '2026-05-05'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'charlie' AND p.name = 'Commodities Hedge'
  AND NOT EXISTS (
      SELECT 1 FROM investments i
      WHERE i.portfolio_id = p.id
        AND i.symbol = 'XAUUSD'
        AND i.asset_type = 'COMMODITY'
        AND i.purchase_date = '2026-05-05'
  );

-- Seed transaction history with FK mapping to portfolios
INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'AAPL', 'STOCK', 'BUY', 10, 175.00, '2026-03-10 10:00:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Retirement Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'AAPL'
        AND t.asset_type = 'STOCK'
        AND t.transaction_type = 'BUY'
        AND t.quantity = 10
        AND t.price = 175.00
        AND t.transaction_date = '2026-03-10 10:00:00'
  );

INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'AAPL', 'STOCK', 'BUY', 5, 196.90, '2026-05-22 14:15:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Retirement Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'AAPL'
        AND t.asset_type = 'STOCK'
        AND t.transaction_type = 'BUY'
        AND t.quantity = 5
        AND t.price = 196.90
        AND t.transaction_date = '2026-05-22 14:15:00'
  );

INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'TSLA', 'STOCK', 'BUY', 12, 210.50, '2026-04-12 09:35:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Short Term Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'TSLA'
        AND t.asset_type = 'STOCK'
        AND t.transaction_type = 'BUY'
        AND t.quantity = 12
        AND t.price = 210.50
        AND t.transaction_date = '2026-04-12 09:35:00'
  );

INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'TSLA', 'STOCK', 'SELL', 3, 242.80, '2026-06-18 11:05:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'alice' AND p.name = 'Short Term Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'TSLA'
        AND t.asset_type = 'STOCK'
        AND t.transaction_type = 'SELL'
        AND t.quantity = 3
        AND t.price = 242.80
        AND t.transaction_date = '2026-06-18 11:05:00'
  );

INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'CORP2029', 'BOND', 'BUY', 5, 1012.00, '2026-04-01 13:20:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'bob' AND p.name = 'Income Portfolio'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'CORP2029'
        AND t.asset_type = 'BOND'
        AND t.transaction_type = 'BUY'
        AND t.quantity = 5
        AND t.price = 1012.00
        AND t.transaction_date = '2026-04-01 13:20:00'
  );

INSERT INTO transactions (portfolio_id, symbol, asset_type, transaction_type, quantity, price, transaction_date)
SELECT p.id, 'XAUUSD', 'COMMODITY', 'BUY', 6, 2210.00, '2026-05-05 16:00:00'
FROM portfolios p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'charlie' AND p.name = 'Commodities Hedge'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.portfolio_id = p.id
        AND t.symbol = 'XAUUSD'
        AND t.asset_type = 'COMMODITY'
        AND t.transaction_type = 'BUY'
        AND t.quantity = 6
        AND t.price = 2210.00
        AND t.transaction_date = '2026-05-05 16:00:00'
  );

