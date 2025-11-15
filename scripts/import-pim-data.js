#!/usr/bin/env node
/**
 * Script to import PIM data from CSV via API
 * This will create ProductMaster and ProductVariant entries
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const EMAIL = 'dremy80@gmail.com';
const PASSWORD = 'test123456';
const CSV_FILE = path.join(__dirname, '../pim-import.csv');

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(
      `${API_URL}/auth/login`,
      { email: EMAIL, password: PASSWORD },
      { withCredentials: true }
    );
    console.log('✅ Logged in successfully');
    return response.headers['set-cookie'] || [];
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function importPIM(cookies) {
  try {
    console.log('📤 Importing PIM data from CSV...');
    
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`CSV file not found: ${CSV_FILE}`);
    }

    const formData = new FormData();
    formData.append('csv', fs.createReadStream(CSV_FILE), {
      filename: 'pim-import.csv',
      contentType: 'text/csv'
    });

    const response = await axios.post(
      `${API_URL}/creator/listings/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: cookies.join('; ')
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('✅ PIM import successful!');
    console.log('📊 Results:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ PIM import failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting PIM data import...\n');
    
    const cookies = await login();
    await importPIM(cookies);
    
    console.log('\n✅ All done!');
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();

