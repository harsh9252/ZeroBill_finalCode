-- Add Party 1 fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_1_name VARCHAR(255) AFTER business_id;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_1_email VARCHAR(255) AFTER party_1_name;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_1_phone VARCHAR(50) AFTER party_1_email;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_1_address TEXT AFTER party_1_phone;

-- Add Party 2 fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_2_name VARCHAR(255) AFTER party_1_address;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_2_email VARCHAR(255) AFTER party_2_name;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_2_phone VARCHAR(50) AFTER party_2_email;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_2_address TEXT AFTER party_2_phone;

-- Add Party 3 fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_3_name VARCHAR(255) AFTER party_2_address;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_3_email VARCHAR(255) AFTER party_3_name;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_3_phone VARCHAR(50) AFTER party_3_email;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_3_address TEXT AFTER party_3_phone;
