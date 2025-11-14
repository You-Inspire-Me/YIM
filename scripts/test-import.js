#!/usr/bin/env node

/**
 * Test script to import PIM CSV directly via API
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testImport() {
  try {
    // Read the CSV file
    const csvPath = './pim-import.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath);

    // Create form data
    const form = new FormData();
    form.append('csv', csvContent, {
      filename: 'pim-import.csv',
      contentType: 'text/csv'
    });

    // You'll need to provide a valid auth token
    // For now, let's try without auth to see what happens
    console.log('Sending CSV import request...');
    
    const response = await axios.post('http://localhost:5000/api/creator/listings/import', form, {
      headers: {
        ...form.getHeaders(),
        // Add auth token if needed
        // 'Cookie': 'token=YOUR_TOKEN_HERE'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Import successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Import failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testImport();

