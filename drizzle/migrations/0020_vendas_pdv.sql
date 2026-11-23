-- Revisão: integrar ao modelo pharma existente

-- 1) pharma_products: novas colunas (PDV/administração)
ALTER TABLE pharma_products
  ADD COLUMN sale_price DECIMAL(12,2) NOT NULL DEFAULT '0' AFTER days_duration,
  ADD COLUMN avg_cost DECIMAL(12,2) NOT NULL DEFAULT '0' AFTER sale_price,
  ADD COLUMN default_margin DECIMAL(6,2) NOT NULL DEFAULT '0' AFTER avg_cost,
  ADD COLUMN unit VARCHAR(10) NOT NULL DEFAULT 'UN' AFTER default_margin,
  ADD COLUMN controlled TINYINT(1) NOT NULL DEFAULT 0 AFTER unit,
  ADD COLUMN requires_prescription TINYINT(1) NOT NULL DEFAULT 0 AFTER controlled,
  ADD COLUMN ncm VARCHAR(8) NULL AFTER requires_prescription,
  ADD COLUMN icms DECIMAL(6,2) NULL AFTER ncm,
  ADD COLUMN pis DECIMAL(6,2) NULL AFTER icms,
  ADD COLUMN cofins DECIMAL(6,2) NULL AFTER pis,
  ADD COLUMN st DECIMAL(6,2) NULL AFTER cofins,
  ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER st,
  ADD COLUMN deleted_at DATETIME NULL AFTER active;

-- 2) Ampliar enum de categoria
ALTER TABLE pharma_products
  MODIFY COLUMN category ENUM('medicamento','generico','perfumaria','hpc','correlato','servico','outros') NOT NULL DEFAULT 'medicamento';

-- 3) Fornecedores
CREATE TABLE pharma_suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trade_name VARCHAR(160) NOT NULL,
  cnpj VARCHAR(14) NOT NULL,
  ie VARCHAR(20) NULL,
  contact VARCHAR(120) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(120) NULL,
  payment_terms VARCHAR(40) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_suppliers_cnpj (cnpj)
);

-- 4) Lote + validade + estoque
CREATE TABLE pharma_product_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_ean VARCHAR(32) NOT NULL,
  lot VARCHAR(40) NOT NULL,
  expiry DATE NOT NULL,
  quantity DECIMAL(14,3) NOT NULL DEFAULT '0',
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT '0',
  entry_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_batches_product (product_ean),
  KEY idx_batches_expiry (expiry),
  CONSTRAINT fk_batches_product FOREIGN KEY (product_ean) REFERENCES pharma_products(ean)
);

-- 5) Preço de compra por fornecedor
CREATE TABLE pharma_supplier_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  product_ean VARCHAR(32) NOT NULL,
  supplier_code VARCHAR(40) NULL,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT '0',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_product (supplier_id, product_ean),
  KEY idx_sp_product (product_ean),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES pharma_suppliers(id),
  CONSTRAINT fk_sp_product FOREIGN KEY (product_ean) REFERENCES pharma_products(ean)
);
