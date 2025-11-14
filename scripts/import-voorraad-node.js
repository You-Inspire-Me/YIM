/**
 * Import voorraad.csv via API
 * Run: node scripts/import-voorraad-node.js
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const CSV_FILE = '/Users/dremy/Downloads/voorraad.csv';
const API_BASE = 'http://localhost:3000/api';

async function importStock() {
  try {
    console.log('🔐 Step 1: Logging in...');
    
    // Try to login - you may need to adjust credentials
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'creator@example.com',
      password: 'password123'
    }, {
      withCredentials: true
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.data);
      process.exit(1);
    }

    console.log('✅ Logged in successfully');
    
    // Get cookies from response
    const cookies = loginResponse.headers['set-cookie'] || [];
    const cookieHeader = cookies.join('; ');

    console.log(`\n📤 Step 2: Uploading ${CSV_FILE}...`);
    
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ File not found: ${CSV_FILE}`);
      process.exit(1);
    }

    const formData = new FormData();
    formData.append('csv', fs.createReadStream(CSV_FILE), {
      filename: 'voorraad.csv',
      contentType: 'text/csv'
    });

    const importResponse = await axios.post(
      `${API_BASE}/merchant/inventory/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Cookie': cookieHeader
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
      }
    );

    console.log(`\n📊 Response status: ${importResponse.status}`);
    console.log('\n📊 Response data:');
    console.log(JSON.stringify(importResponse.data, null, 2));

    if (importResponse.data.success) {
      console.log(`\n✅ Success: ${importResponse.data.success.length} stocks updated`);
    }
    if (importResponse.data.errors && importResponse.data.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${importResponse.data.errors.length} errors`);
      console.log('\nFirst 10 errors:');
      importResponse.data.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Row ${err.row}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Import failed!');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

importStock();

