// src/tests/mobile-api-tests.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
let testCardId = null;
let testUserId = null;
let testBarcode = null;
let testAssemblyId = null;

// Utility functions
const logSuccess = (message) => console.log(`✅ ${message}`);
const logError = (message, error) => {
  console.error(`❌ ${message}`);
  if (error) console.error(error);
};

// Test runner
async function runTests() {
  console.log('🧪 Starting Mobile API Tests');
  console.log('===========================');
  
  try {
    // Test 1: Validate NFC card
    await testValidateNfcCard();
    
    // Test 2: Get assembly by barcode
    await testGetAssemblyByBarcode();
    
    // Test 3: Update assembly status
    await testUpdateAssemblyStatus();
    
    console.log('===========================');
    console.log('🎉 All tests completed');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Test functions
async function testValidateNfcCard() {
  console.log('\n🔍 Testing NFC card validation');
  
  try {
    // First, create a test NFC card if needed
    if (!testCardId) {
      // Get a test user first
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to get users: ${usersResponse.statusText}`);
      }
      
      const usersData = await usersResponse.json();
      if (!usersData.data || usersData.data.length === 0) {
        throw new Error('No users found for testing');
      }
      
      // Use the first worker user
      const worker = usersData.data.find(user => user.role === 'worker');
      if (!worker) {
        throw new Error('No worker users found for testing');
      }
      
      testUserId = worker.id;
      
      // Create a test NFC card for this user
      const cardId = `TEST-CARD-${Date.now()}`;
      const createCardResponse = await fetch(`${API_URL}/nfc/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify({
          cardId,
          userId: testUserId,
          isActive: true
        })
      });
      
      if (!createCardResponse.ok) {
        throw new Error(`Failed to create test card: ${createCardResponse.statusText}`);
      }
      
      const cardData = await createCardResponse.json();
      testCardId = cardData.data.card_id;
      
      logSuccess(`Created test NFC card: ${testCardId}`);
    }
    
    // Now validate the card
    const validateResponse = await fetch(`${API_URL}/nfc/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cardId: testCardId
      })
    });
    
    if (!validateResponse.ok) {
      throw new Error(`Validation failed: ${validateResponse.statusText}`);
    }
    
    const validateData = await validateResponse.json();
    testUserId = validateData.data.userId;
    
    logSuccess('NFC card validated successfully');
    console.log(`User ID: ${testUserId}`);
    console.log(`User name: ${validateData.data.fullName}`);
    
    return validateData;
  } catch (error) {
    logError('NFC card validation test failed', error);
    throw error;
  }
}

async function testGetAssemblyByBarcode() {
  console.log('\n🔍 Testing get assembly by barcode');
  
  try {
    // First, get a test assembly if needed
    if (!testBarcode) {
      // Get assemblies
      const assembliesResponse = await fetch(`${API_URL}/assemblies/barcodes`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
        }
      });
      
      if (!assembliesResponse.ok) {
        // If no barcodes exist, we need to create one
        // Get an assembly first
        const projectsResponse = await fetch(`${API_URL}/projects`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
          }
        });
        
        if (!projectsResponse.ok) {
          throw new Error('Unable to get projects for testing');
        }
        
        const projectsData = await projectsResponse.json();
        if (!projectsData.data || projectsData.data.length === 0) {
          throw new Error('No projects found for testing');
        }
        
        const projectId = projectsData.data[0].id;
        
        // Get assemblies for this project
        const projectAssembliesResponse = await fetch(`${API_URL}/projects/${projectId}/assemblies`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
          }
        });
        
        if (!projectAssembliesResponse.ok) {
          throw new Error('Unable to get assemblies for testing');
        }
        
        const assembliesData = await projectAssembliesResponse.json();
        if (!assembliesData.data || assembliesData.data.length === 0) {
          throw new Error('No assemblies found for testing');
        }
        
        testAssemblyId = assembliesData.data[0].id;
        
        // Create a barcode for this assembly
        const createBarcodeResponse = await fetch(`${API_URL}/assemblies/barcode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
          },
          body: JSON.stringify({
            assemblyId: testAssemblyId
          })
        });
        
        if (!createBarcodeResponse.ok) {
          throw new Error(`Failed to create barcode: ${createBarcodeResponse.statusText}`);
        }
        
        const barcodeData = await createBarcodeResponse.json();
        testBarcode = barcodeData.data.barcode;
        
        logSuccess(`Created test barcode: ${testBarcode}`);
      } else {
        // Use an existing barcode
        const barcodesData = await assembliesResponse.json();
        if (barcodesData.data && barcodesData.data.length > 0) {
          testBarcode = barcodesData.data[0].barcode;
          testAssemblyId = barcodesData.data[0].assemblyId;
        } else {
          throw new Error('No barcodes found for testing');
        }
      }
    }
    
    // Get assembly by barcode using mobile API
    const assemblyResponse = await fetch(`${API_URL}/mobile/assemblies/barcode/${testBarcode}?userId=${testUserId}`);
    
    if (!assemblyResponse.ok) {
      throw new Error(`Get assembly failed: ${assemblyResponse.statusText}`);
    }
    
    const assemblyData = await assemblyResponse.json();
    
    logSuccess('Got assembly by barcode successfully');
    console.log(`Assembly name: ${assemblyData.data.name}`);
    console.log(`Assembly status: ${assemblyData.data.status}`);
    
    return assemblyData;
  } catch (error) {
    logError('Get assembly by barcode test failed', error);
    throw error;
  }
}

async function testUpdateAssemblyStatus() {
  console.log('\n🔍 Testing update assembly status');
  
  try {
    // Get current status first to avoid setting the same status
    const assemblyResponse = await fetch(`${API_URL}/mobile/assemblies/barcode/${testBarcode}?userId=${testUserId}`);
    
    if (!assemblyResponse.ok) {
      throw new Error(`Get assembly failed: ${assemblyResponse.statusText}`);
    }
    
    const assemblyData = await assemblyResponse.json();
    const currentStatus = assemblyData.data.status;
    
    // Choose a different status
    const statuses = ['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'];
    const newStatus = statuses.find(s => s !== currentStatus) || 'In Production';
    
    // Update the status
    const updateResponse = await fetch(`${API_URL}/mobile/assemblies/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assemblyId: testAssemblyId,
        status: newStatus,
        userId: testUserId,
        cardId: testCardId,
        deviceInfo: {
          appVersion: '1.0.0-test',
          deviceModel: 'Test Device',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Update status failed: ${updateResponse.statusText}`);
    }
    
    const updateData = await updateResponse.json();
    
    logSuccess('Updated assembly status successfully');
    console.log(`Previous status: ${currentStatus}`);
    console.log(`New status: ${newStatus}`);
    
    return updateData;
  } catch (error) {
    logError('Update assembly status test failed', error);
    throw error;
  }
}

// Run the tests
runTests().catch(console.error);