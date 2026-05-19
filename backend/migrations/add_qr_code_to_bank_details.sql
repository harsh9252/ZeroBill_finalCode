-- Migration: Add qr_code column to bank_details table
-- Created At: 2026-03-31
-- Purpose: Support for bank scanner (QR Code) payment images

ALTER TABLE bank_details ADD COLUMN qr_code VARCHAR(255) DEFAULT NULL;
