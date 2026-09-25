CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(120) NOT NULL,
  `cnpj` varchar(14),
  `ie` varchar(20),
  `city` varchar(80),
  `uf` varchar(2),
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_categories_org` ON `categories` (`organizationId`);
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL REFERENCES organizations(id),
  `name` varchar(80) NOT NULL,
  `type` enum('MEDICAMENTO','GENERICO','HPC','PERFUMARIA','CORRELATO','SERVICO') NOT NULL DEFAULT 'MEDICAMENTO',
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_products_org` ON `products` (`organizationId`);
CREATE INDEX IF NOT EXISTS `idx_products_ean` ON `products` (`ean`);
CREATE INDEX IF NOT EXISTS `idx_products_name` ON `products` (`name`);
CREATE INDEX IF NOT EXISTS `idx_products_ingredient` ON `products` (`activeIngredient`);
CREATE TABLE IF NOT EXISTS `products` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL REFERENCES organizations(id),
  `categoryId` int NOT NULL REFERENCES categories(id),
  `ean` varchar(14),
  `name` varchar(160) NOT NULL,
  `activeIngredient` varchar(120),
  `ncm` varchar(8),
  `unit` varchar(10) NOT NULL DEFAULT 'UN',
  `controlled` boolean NOT NULL DEFAULT false,
  `requiresPrescription` boolean NOT NULL DEFAULT false,
  `avgCost` decimal(12,2) NOT NULL DEFAULT '0',
  `salePrice` decimal(12,2) NOT NULL DEFAULT '0',
  `defaultMargin` decimal(6,2) NOT NULL DEFAULT '0',
  `icms` decimal(6,2),
  `pis` decimal(6,2),
  `cofins` decimal(6,2),
  `st` decimal(6,2),
  `active` boolean NOT NULL DEFAULT true,
  `deletedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_batches_org_product` ON `productBatches` (`organizationId`, `productId`);
CREATE INDEX IF NOT EXISTS `idx_batches_expiry` ON `productBatches` (`expiry`);
CREATE TABLE IF NOT EXISTS `productBatches` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL REFERENCES organizations(id),
  `productId` int NOT NULL REFERENCES products(id),
  `lot` varchar(40) NOT NULL,
  `expiry` date NOT NULL,
  `quantity` decimal(14,3) NOT NULL DEFAULT '0',
  `unitCost` decimal(12,2) NOT NULL DEFAULT '0',
  `entryDate` date NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_suppliers_org` ON `suppliers` (`organizationId`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_suppliers_org_cnpj` ON `suppliers` (`organizationId`, `cnpj`);
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL REFERENCES organizations(id),
  `tradeName` varchar(160) NOT NULL,
  `cnpj` varchar(14) NOT NULL,
  `ie` varchar(20),
  `contact` varchar(120),
  `phone` varchar(20),
  `email` varchar(120),
  `paymentTerms` varchar(40),
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_supplier_products_product` ON `supplierProducts` (`productId`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_supplier_products_pair` ON `supplierProducts` (`supplierId`, `productId`);
CREATE TABLE IF NOT EXISTS `supplierProducts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `supplierId` int NOT NULL REFERENCES suppliers(id),
  `productId` int NOT NULL REFERENCES products(id),
  `supplierCode` varchar(40),
  `purchasePrice` decimal(12,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
