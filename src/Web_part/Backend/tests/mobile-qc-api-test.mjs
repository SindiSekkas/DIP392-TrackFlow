// mobile-qc-api-test.mjs - Simplified to match working endpoints

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'PupsoTeam.png');
const TEST_NFC_CARD = '73:3A:79:25';

// State variables
let userId = null;
let testAssemblyId = 'f54edad4-c056-443b-b3cc-65103bb043e8'; // Use known ID
let uploadedQcImageId = null;

// Helper functions
const logStep = (step) => console.log(`\n=== ${step} ===`);
const logSuccess = (message) => console.log(`✅ ${message}`);
const logError = (message, error) => {
  console.error(`❌ ${message}`);
  if (error) console.error(error);
};

// Create test image if needed
const checkTestImage = () => {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.warn(`Warning: Test image not found at ${TEST_IMAGE_PATH}`);
    console.warn('Creating a small test image file...');
    
    // Create a small sample 1x1 JPEG file with a red pixel
    const base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(TEST_IMAGE_PATH, imageBuffer);
    
    logSuccess('Created a test image file');
  }
};

// Step 1: Standard NFC authentication - this works with your existing API
const authenticateWithNFC = async () => {
  try {
    logStep('Authenticating with NFC card');
    
    const response = await fetch(`${API_URL}/nfc/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: TEST_NFC_CARD })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    userId = data.data.userId;
    
    logSuccess(`Authenticated successfully. User ID: ${userId}`);
    return data.data;
  } catch (error) {
    logError('Authentication failed', error);
    process.exit(1);
  }
};

// Step 2: Upload QC image
const uploadQCImage = async () => {
  try {
    logStep('Uploading QC image with status');
    checkTestImage();
    
    // Create form data with userId and cardId fields exactly as batch/assemblies expect
    const form = new FormData();
    form.append('image', fs.createReadStream(TEST_IMAGE_PATH));
    form.append('qcStatus', 'Passed');
    form.append('notes', 'Test QC image uploaded via API test script');
    form.append('userId', userId);
    form.append('cardId', TEST_NFC_CARD);
    form.append('deviceInfo', JSON.stringify({
      deviceType: 'Test',
      appVersion: '1.0.0'
    }));
    
    const response = await fetch(`${API_URL}/mobile/assemblies/${testAssemblyId}/qc`, {
      method: 'POST',
      body: form
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    uploadedQcImageId = data.data.qc_image?.id;
    
    logSuccess('QC image uploaded successfully');
    return data.data;
  } catch (error) {
    logError('Failed to upload QC image', error);
    return null;
  }
};

// Main function
const runTests = async () => {
  console.log('Starting Mobile QC API Test');
  console.log(`API URL: ${API_URL}`);
  
  await authenticateWithNFC();
  await uploadQCImage();
  
  console.log('\n=== Test completed ===');
};

// Run tests
runTests().catch(error => {
  console.error('Test failed with unexpected error:', error);
  process.exit(1);
});