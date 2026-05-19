/*
  Update OTP purpose enum to include business_verification.
  This is required for the business management module email verification.
*/

ALTER TABLE otps 
MODIFY COLUMN purpose ENUM('login', 'signup', 'reset_password', 'business_verification') 
NOT NULL;
