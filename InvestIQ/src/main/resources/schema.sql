CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_portfolios_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_quotes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL,
    company_name VARCHAR(100),
    current_price DECIMAL(10, 2) NOT NULL,
    price_change DECIMAL(10, 2),
    percent_change DECIMAL(5, 2),
    previous_close DECIMAL(10, 2),
    day_high DECIMAL(10, 2),
    day_low DECIMAL(10, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @stock_currency_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_quotes'
      AND COLUMN_NAME = 'currency'
);
SET @stock_currency_sql := IF(
    @stock_currency_exists = 0,
    'ALTER TABLE stock_quotes ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT ''USD'' AFTER symbol',
    'SELECT 1'
);
PREPARE stock_stmt FROM @stock_currency_sql;
EXECUTE stock_stmt;
DEALLOCATE PREPARE stock_stmt;

CREATE TABLE IF NOT EXISTS bonds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL,
    issuer VARCHAR(100) NOT NULL,
    face_value DECIMAL(15, 2) NOT NULL,
    coupon_rate DECIMAL(5, 2) NOT NULL,
    maturity_date DATE NOT NULL
);

SET @bond_currency_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bonds'
      AND COLUMN_NAME = 'currency'
);
SET @bond_currency_sql := IF(
    @bond_currency_exists = 0,
    'ALTER TABLE bonds ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT ''USD'' AFTER symbol',
    'SELECT 1'
);
PREPARE bond_stmt FROM @bond_currency_sql;
EXECUTE bond_stmt;
DEALLOCATE PREPARE bond_stmt;

CREATE TABLE IF NOT EXISTS investments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    CONSTRAINT fk_investments_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(10) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commodities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    category ENUM('GOLD', 'SILVER', 'PLATINUM', 'OIL') NOT NULL,
    unit VARCHAR(20),
    current_price DECIMAL(10, 2) NOT NULL,
    price_change DECIMAL(10, 2),
    percent_change DECIMAL(5, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @commodity_currency_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'commodities'
      AND COLUMN_NAME = 'currency'
);
SET @commodity_currency_sql := IF(
    @commodity_currency_exists = 0,
    'ALTER TABLE commodities ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT ''USD'' AFTER name',
    'SELECT 1'
);
PREPARE commodity_stmt FROM @commodity_currency_sql;
EXECUTE commodity_stmt;
DEALLOCATE PREPARE commodity_stmt;

