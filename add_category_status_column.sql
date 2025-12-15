-- Add status column to categories table
ALTER TABLE `categories` ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER `image`;

-- Update all existing categories to active status
UPDATE `categories` SET `status` = 'active' WHERE `status` IS NULL OR `status` = '';

