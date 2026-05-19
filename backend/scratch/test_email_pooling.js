const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { initializeEmailService, sendEmail } = require('../utils/nodemailerService');

async function testPooling() {
  console.log('--- Email Pooling Test ---');
  
  const initialized = initializeEmailService();
  if (!initialized) {
    console.error('Failed to initialize email service');
    return;
  }

  const testEmail = process.env.EMAIL_USER; // Send to self
  if (!testEmail) {
    console.error('EMAIL_USER not set in .env');
    return;
  }

  console.log(`Sending 3 test emails to ${testEmail} to test connection pooling...`);

  const results = await Promise.all([
    sendEmail(testEmail, 'Pooling Test 1', '<p>Test 1</p>'),
    sendEmail(testEmail, 'Pooling Test 2', '<p>Test 2</p>'),
    sendEmail(testEmail, 'Pooling Test 3', '<p>Test 3</p>')
  ]);

  console.log('Results:');
  results.forEach((res, i) => {
    console.log(`Email ${i + 1}: ${res.success ? 'SUCCESS' : 'FAILED (' + res.error + ')'}`);
  });

  console.log('--- Test Complete ---');
}

testPooling();
