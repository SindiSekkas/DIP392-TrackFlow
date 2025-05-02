// src/Web_part/Backend/tests/mobile-logistics-api-test.js
import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'https://api.trackflow.pl/api';
// Increase timeout to allow for slower connections
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Helper function to make API requests with improved error handling
async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method: method,
    url: url,
    headers: {
      'Content-Type': 'application/json'
    },
    data: data,
    timeout: REQUEST_TIMEOUT // Add timeout
  };
  
  console.log(`Making ${method} request to ${url}`);
  if (data) {
    console.log('Request Body:', JSON.stringify(data, null, 2));
  }
  
  try {
    const response = await axios(config);
    
    console.log(`Response (${response.status}):`, JSON.stringify(response.data, null, 2));
    console.log('---------------------------------------------------------');
    
    return { 
      status: response.status, 
      data: response.data,
      success: response.status >= 200 && response.status < 300
    };
  } catch (error) {
    // Enhanced error handling
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused: The server is not running or not accessible');
      console.log('---------------------------------------------------------');
      return {
        status: 0,
        data: { error: 'Connection refused. Is the server running?' },
        success: false
      };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('Request timed out: The server took too long to respond');
      console.log('---------------------------------------------------------');
      return {
        status: 0,
        data: { error: 'Request timed out' },
        success: false
      };
    } else if (error.response) {
      // Server responded with error status
      console.log(`Error Response (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
      console.log('---------------------------------------------------------');
      
      return {
        status: error.response.status,
        data: error.response.data,
        success: false
      };
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server. Details:', error.message);
      console.log('---------------------------------------------------------');
    } else {
      // Error in request setup
      console.error('Request setup error:', error.message);
      console.log('---------------------------------------------------------');
    }
    
    return { 
      status: 0, 
      data: { error: error.message || 'Unknown error' },
      success: false
    };
  }
}

// Check if server is running before proceeding with tests
async function checkServerHealth() {
  try {
    console.log('\n[TEST] Server Health Check');
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ Server is running and responding');
      return true;
    } else {
      console.log('❌ Server health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    console.error('Please ensure the server is running at', API_BASE_URL);
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused: The server is not running or not accessible');
    }
    return false;
  }
}

// Test NFC Card Validation - First step in the workflow
async function testNfcCardValidation() {
  console.log('\n[TEST] NFC Card Validation');
  
  // Using a valid NFC card ID from test data
  const cardId = '73:3A:79:25'; // John Painter card
  
  const result = await makeRequest('POST', '/nfc/validate', {
    cardId: cardId
  });
  
  if (result.success) {
    nfcCardId = cardId;
    userId = result.data.data.userId;
    
    console.log('✅ NFC Card validation successful');
    console.log(`User ID: ${userId}`);
    console.log(`Card ID: ${nfcCardId}`);
    return true;
  } else {
    console.log('❌ NFC Card validation failed');
    return false;
  }
}

// Test Batch Barcode Validation
async function testBatchBarcodeValidation() {
  console.log('\n[TEST] Batch Barcode Validation');
  
  // Test batch barcode - should be updated to match your test data
  const barcode = 'BATCH-MA1BAE59-ZJ587';
  
  const result = await makeRequest('POST', '/mobile/logistics/batches/validate', {
    barcode: barcode,
    userId: userId,
    deviceInfo: {
      deviceType: 'Mobile',
      appVersion: '1.0.0',
      testMode: true
    }
  });
  
  if (result.success) {
    batchBarcode = barcode;
    batchId = result.data.data.id;
    
    console.log('✅ Batch barcode validation successful');
    console.log(`Batch ID: ${batchId}`);
    console.log(`Batch Number: ${result.data.data.batch_number}`);
    return true;
  } else {
    console.log('❌ Batch barcode validation failed');
    return false;
  }
}

// Test Adding Assembly to Batch
async function testAddAssemblyToBatch() {
  console.log('\n[TEST] Add Assembly to Batch');
  
  // Test assembly barcode - should be updated to match your test data
  const assemblyBarcodeValue = 'ASM-MA1EOAB3-VH5NM'; // From test documentation
  
  const result = await makeRequest('POST', '/mobile/logistics/batches/add-assembly', {
    batchId: batchId,
    assemblyBarcode: assemblyBarcodeValue,
    userId: userId,
    cardId: nfcCardId,
    deviceInfo: {
      deviceType: 'Mobile',
      appVersion: '1.0.0',
      scanType: 'barcode',
      testMode: true
    }
  });
  
  if (result.success) {
    assemblyBarcode = assemblyBarcodeValue; // Store for later tests
    batchAssemblyId = result.data.data.id;
    
    console.log('✅ Assembly added to batch successfully');
    console.log(`Batch Assembly ID: ${batchAssemblyId}`);
    console.log(`Assembly Name: ${result.data.data.assembly_name}`);
    return true;
  } else {
    console.log('❌ Failed to add assembly to batch');
    return false;
  }
}

// Test Getting Batch Assemblies
async function testGetBatchAssemblies() {
  console.log('\n[TEST] Get Batch Assemblies');
  
  // Changed from GET to POST and moved userId to request body
  const result = await makeRequest('POST', `/mobile/logistics/batches/${batchId}/assemblies`, {
    userId: userId,
    deviceInfo: {
      deviceType: 'Mobile',
      appVersion: '1.0.0',
      testMode: true
    }
  });
  
  if (result.success) {
    console.log('✅ Retrieved batch assemblies successfully');
    console.log(`Assembly Count: ${result.data.data.assembly_count}`);
    return true;
  } else {
    console.log('❌ Failed to retrieve batch assemblies');
    return false;
  }
}

// Test Removing Assembly from Batch
async function testRemoveAssemblyFromBatch() {
  console.log('\n[TEST] Remove Assembly from Batch');
  
  if (!batchAssemblyId) {
    console.log('❌ No batch assembly ID available for removal test');
    return false;
  }
  
  const result = await makeRequest('DELETE', `/mobile/logistics/batch-assemblies/${batchAssemblyId}`, {
    userId: userId,
    cardId: nfcCardId,
    deviceInfo: {
      deviceType: 'Mobile',
      appVersion: '1.0.0',
      testMode: true
    }
  });
  
  if (result.success) {
    console.log('✅ Assembly removed from batch successfully');
    console.log(`Remaining Assemblies: ${result.data.data.assemblies_remaining}`);
    return true;
  } else {
    console.log('❌ Failed to remove assembly from batch');
    return false;
  }
}

// Global variables to store test data
let nfcCardId = '';
let userId = '';
let batchId = '';
let batchBarcode = '';
let assemblyBarcode = '';
let batchAssemblyId = '';

// Run all tests in sequence
async function runTests() {
  console.log('==========================================================');
  console.log('📱 MOBILE LOGISTICS API TEST SCRIPT');
  console.log('==========================================================\n');
  
  // First check if the server is running
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('❌ Cannot proceed with tests - Server is not running or not responding');
    return;
  }
  
  const nfcSuccess = await testNfcCardValidation();
  if (!nfcSuccess) {
    console.log('❌ Cannot proceed with tests - NFC validation failed');
    return;
  }
  
  const batchSuccess = await testBatchBarcodeValidation();
  if (!batchSuccess) {
    console.log('❌ Cannot proceed with tests - Batch validation failed');
    return;
  }
  
  const addSuccess = await testAddAssemblyToBatch();
  if (!addSuccess) {
    console.log('⚠️ Add assembly test failed, but continuing with other tests');
  }
  
  await testGetBatchAssemblies();
  
  if (addSuccess) {
    await testRemoveAssemblyFromBatch();
  }
  
  console.log('\n==========================================================');
  console.log('📱 TEST SCRIPT COMPLETED');
  console.log('==========================================================');
}

// Run the tests
runTests().catch(error => {
  console.error('Test script error:', error);
});