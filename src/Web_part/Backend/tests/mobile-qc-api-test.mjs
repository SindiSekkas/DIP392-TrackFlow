// mobile-qc-api-test.mjs - Updated for new API structure with separate QC notes

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

// Step 2: Upload QC image with its own notes (doesn't affect assembly QC notes)
const uploadQCImage = async () => {
  try {
    logStep('Uploading QC image with issue-specific status and notes');
    checkTestImage();
    
    // Create form data with userId and cardId fields exactly as batch/assemblies expect
    const form = new FormData();
    form.append('image', fs.createReadStream(TEST_IMAGE_PATH));
    form.append('qcStatus', 'Failed'); // Using Failed for the specific image
    form.append('notes', 'Specific defect: Плохая покраска крепежных элементов'); // Issue-specific note
    form.append('userId', userId);
    form.append('cardId', TEST_NFC_CARD);
    form.append('deviceInfo', JSON.stringify({
      deviceType: 'Test',
      appVersion: '1.0.0'
    }));
    
    const response = await fetch(`${API_URL}/mobile/assemblies/${testAssemblyId}/qc-upload`, {
      method: 'POST',
      body: form
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    uploadedQcImageId = data.data.qc_image?.id;
    
    logSuccess('QC image uploaded successfully with issue-specific notes');
    console.log('  Image notes:', data.data.qc_image?.notes);
    return data.data;
  } catch (error) {
    logError('Failed to upload QC image', error);
    return null;
  }
};

// Step 3: Update the overall QC notes for the assembly (separate from image notes)
const updateAssemblyQCNotes = async () => {
  try {
    logStep('Updating overall QC notes for the assembly');
    
    // The new endpoint for updating assembly QC notes
    const response = await fetch(`${API_URL}/mobile/assemblies/${testAssemblyId}/qc-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qcStatus: 'Conditional Pass', // Different status than the image
        notes: 'Overall assessmentsss: Имеется несколько дефектов покраски, требуется дополнительная проверка перед отправкой',
        userId: userId,
        cardId: TEST_NFC_CARD,
        deviceInfo: {
          deviceType: 'Test',
          appVersion: '1.0.0'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    logSuccess('Assembly QC notes updated successfully');
    console.log('  Overall QC notes:', data.data.quality_control_notes);
    console.log('  Overall QC status:', data.data.quality_control_status);
    
    return data.data;
  } catch (error) {
    logError('Failed to update assembly QC notes', error);
    return null;
  }
};

// Step 4: Retrieve QC images to verify the uploaded image
const retrieveQCImages = async () => {
  if (!testAssemblyId) {
    logError('Cannot retrieve QC images: No testAssemblyId available.');
    return null;
  }
  if (!userId) {
    logError('Cannot retrieve QC images: No userId available from authentication step.');
    return null;
  }

  try {
    logStep(`Retrieving QC images for assembly ID: ${testAssemblyId}`);

    const retrieveUrl = `${API_URL}/mobile/assemblies/${testAssemblyId}/qc-images`;

    // Use POST and send userId/cardId in the body as expected by middleware
    const response = await fetch(retrieveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        cardId: TEST_NFC_CARD
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    // Parse the response based on expected structure
    const images = data.data || [];
    
    if (!Array.isArray(images)) {
      throw new Error('Expected an array of images in the response, got: ' + JSON.stringify(data));
    }

    logSuccess(`Retrieved ${images.length} QC images`);
    
    // Check if our uploaded image exists
    if (uploadedQcImageId) {
      const foundImage = images.find(img => img.id === uploadedQcImageId);
      
      if (foundImage) {
        logSuccess(`Found our recently uploaded QC image (ID: ${uploadedQcImageId})`);
        console.log('  Image notes:', foundImage.notes);
        console.log('  Image QC status:', foundImage.qc_status);
        return images;
      } else {
        logError(`Uploaded QC image ID ${uploadedQcImageId} not found in results.`);
      }
    }
    
    return images;
  } catch (error) {
    logError('Failed to retrieve QC images', error);
    return null;
  }
};

// Step 5: Retrieve assembly details to verify QC notes are separate
const verifyAssemblyQCNotes = async () => {
  try {
    logStep('Verifying assembly QC notes are separate from image notes');
    
    // Get assembly details - use POST method to include auth info in body, similar to QC images endpoint
    const response = await fetch(`${API_URL}/mobile/assemblies/barcode/ASM-MA3WU7N4-ZT0GV?userId=d9e9f4c4-35a6-4fac-b961-8ac85f61b181`, {
      method: 'GET', // Changed from GET to POST to include authentication in body
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    const assembly = data.data;
    
    logSuccess('Retrieved assembly details');
    console.log('  Assembly QC notes:', assembly.quality_control_notes || 'None');
    console.log('  Assembly QC status:', assembly.quality_control_status || 'None');
    
    return assembly;
  } catch (error) {
    logError('Failed to verify assembly QC notes', error);
    return null;
  }
};

// Main function
const runTests = async () => {
  console.log('Starting Mobile QC API Test for Separate QC Notes');
  console.log(`API URL: ${API_URL}`);
  console.log(`Testing with assembly ID: ${testAssemblyId}`);
  
  // Step 1: Authenticate with NFC
  await authenticateWithNFC();
  
  // Step 2: Upload QC image with issue-specific notes
  await uploadQCImage();
  
  // Step 3: Update assembly overall QC notes
  await updateAssemblyQCNotes();
  
  // Step 4: Retrieve QC images to verify they have separate notes
  await retrieveQCImages();
  
  // Step 5: Verify assembly has its own QC notes that weren't affected by image upload
  await verifyAssemblyQCNotes();
  
  console.log('\n=== Test completed ===');
};

// Run tests
runTests().catch(error => {
  console.error('Test failed with unexpected error:', error);
  process.exit(1);
});