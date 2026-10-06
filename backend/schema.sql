-- ThreadLine Garment ERP/POS MySQL Database Schema
CREATE DATABASE IF NOT EXISTS threadline_db;
USE threadline_db;

-- 1. App Data Store Table (Stores flexible JSON collections & tables for realtime sync)
CREATE TABLE IF NOT EXISTS app_collections (
    collection_name VARCHAR(100) PRIMARY KEY,
    collection_data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Structured Relational Areas Table
CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    assigned_day VARCHAR(20),
    agent_name VARCHAR(100),
    total_customers INT DEFAULT 0,
    outstanding_balance DECIMAL(12,2) DEFAULT 0.00,
    target_collection DECIMAL(12,2) DEFAULT 0.00,
    collected_so_far DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50),
    color VARCHAR(20)
);

-- 3. Structured Relational Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    shop_name VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(100),
    area_id VARCHAR(50),
    area_name VARCHAR(100),
    purchases DECIMAL(12,2) DEFAULT 0.00,
    last_visit VARCHAR(50),
    balance DECIMAL(12,2) DEFAULT 0.00,
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50),
    status_type VARCHAR(50),
    avatar VARCHAR(255),
    visit_status VARCHAR(50),
    address TEXT
);

-- 4. Structured Relational Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    details TEXT,
    category VARCHAR(100),
    sku VARCHAR(50),
    stock INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    godown1 INT DEFAULT 0,
    godown2 INT DEFAULT 0,
    status VARCHAR(50),
    status_type VARCHAR(50),
    img TEXT
);

-- 5. Structured Relational Sales Invoices Table
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    customer VARCHAR(150),
    customer_id INT,
    area_name VARCHAR(100),
    area_id VARCHAR(50),
    date VARCHAR(50),
    items TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_type VARCHAR(50),
    status VARCHAR(50)
);

-- 6. Structured Relational Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    shop_name VARCHAR(150),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    area VARCHAR(100),
    gst_number VARCHAR(50),
    categories TEXT,
    product_types TEXT,
    price_range VARCHAR(50),
    payment_terms VARCHAR(100),
    delivery_time_days INT DEFAULT 3,
    rating DECIMAL(3,1) DEFAULT 4.5,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Structured Relational Supplier Purchases Table
CREATE TABLE IF NOT EXISTS supplier_purchases (
    id VARCHAR(50) PRIMARY KEY,
    purchase_order_no VARCHAR(50),
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(150),
    purchase_date VARCHAR(50),
    product_name VARCHAR(150),
    category VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    quantity INT DEFAULT 1,
    cost_per_item DECIMAL(12,2) DEFAULT 0.00,
    total_purchase_cost DECIMAL(12,2) DEFAULT 0.00,
    delivery_charge DECIMAL(12,2) DEFAULT 0.00,
    discount DECIMAL(12,2) DEFAULT 0.00,
    final_cost DECIMAL(12,2) DEFAULT 0.00,
    effective_cost_per_item DECIMAL(12,2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Paid',
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    pending_amount DECIMAL(12,2) DEFAULT 0.00,
    expected_delivery_date VARCHAR(50),
    actual_delivery_date VARCHAR(50),
    delivery_status VARCHAR(50) DEFAULT 'On Time',
    delivery_days INT DEFAULT 3,
    notes TEXT
);

-- 8. Supplier Products Catalog Table
CREATE TABLE IF NOT EXISTS supplier_products (
    id VARCHAR(50) PRIMARY KEY,
    supplier_id VARCHAR(50),
    product_name VARCHAR(150),
    category VARCHAR(100),
    base_price DECIMAL(12,2) DEFAULT 0.00,
    delivery_estimate_charge DECIMAL(12,2) DEFAULT 0.00,
    avg_discount_pct DECIMAL(5,2) DEFAULT 0.00,
    min_order_qty INT DEFAULT 1,
    lead_time_days INT DEFAULT 3,
    availability VARCHAR(50) DEFAULT 'In Stock'
);

-- 9. Supplier Payments Ledger Table
CREATE TABLE IF NOT EXISTS supplier_payments (
    id VARCHAR(50) PRIMARY KEY,
    purchase_id VARCHAR(50),
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(150),
    amount DECIMAL(12,2) DEFAULT 0.00,
    payment_mode VARCHAR(50),
    payment_date VARCHAR(50),
    notes TEXT
);

-- 10. Automated Payment Reminders Table
CREATE TABLE IF NOT EXISTS payment_reminders (
    reminder_id VARCHAR(100) PRIMARY KEY,
    customer_id INT NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    pending_amount DECIMAL(12,2) DEFAULT 0.00,
    due_date VARCHAR(50),
    days_overdue INT DEFAULT 0,
    message TEXT,
    sent_date VARCHAR(50),
    sent_time VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Sent',
    channel VARCHAR(50) DEFAULT 'WhatsApp & SMS',
    created_at VARCHAR(50)
);

-- 11. Payment Reminder Automation Settings Table
CREATE TABLE IF NOT EXISTS reminder_settings (
    id VARCHAR(50) PRIMARY KEY,
    reminder_time VARCHAR(20) DEFAULT '09:00',
    is_enabled BOOLEAN DEFAULT TRUE,
    channel VARCHAR(50) DEFAULT 'WhatsApp & SMS',
    last_run_date VARCHAR(50),
    last_run_timestamp VARCHAR(50),
    updated_at VARCHAR(50)
);

-- Initial Seed Message
SELECT 'ThreadLine MySQL Schema with Supplier System and Overdue Payment Reminders Created Successfully!' AS Message;
