-- Add 'out_of_stock' status to products table
-- Run this SQL query in your database to add support for 'out_of_stock' status

ALTER TABLE `products` 
MODIFY COLUMN `status` ENUM('active', 'inactive', 'out_of_stock') DEFAULT 'active';

-- Verify the change
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'u723435472_shreeram_ecom' 
-- AND TABLE_NAME = 'products' 
-- AND COLUMN_NAME = 'status';

