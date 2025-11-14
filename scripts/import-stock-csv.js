import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';
const CSV_FILE = '/Users/dremy/Downloads/voorraad.csv';

async function importStockCsv() {
  try {
    // Step 1: Login as creator
    console.log('🔐 Logging in as creator...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'creator@example.com',
      password: 'password123'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!loginResponse.data.token) {
      console.error('❌ Login failed:', loginResponse.data);
      process.exit(1);
    }

    console.log('✅ Logged in successfully');

    // Step 2: Read CSV file
    console.log(`📄 Reading CSV file: ${CSV_FILE}`);
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ File not found: ${CSV_FILE}`);
      process.exit(1);
    }

    // Step 3: Create FormData
    const formData = new FormData();
    formData.append('csv', fs.createReadStream(CSV_FILE), {
      filename: 'voorraad.csv',
      contentType: 'text/csv'
    });

    // Step 4: Upload CSV
    console.log('📤 Uploading CSV to import endpoint...');
    const importResponse = await axios.post(
      `${API_BASE}/merchant/inventory/import`,
      formData,
      {
        withCredentials: true,
        headers: {
          ...formData.getHeaders(),
          'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('✅ Import completed!');
    console.log('📊 Result:', JSON.stringify(importResponse.data, null, 2));

    if (importResponse.data.success) {
      console.log(`\n✅ Success: ${importResponse.data.success.length} stocks updated`);
    }
    if (importResponse.data.errors && importResponse.data.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${importResponse.data.errors.length} errors`);
      console.log('First 10 errors:');
      importResponse.data.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Row ${err.row}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

importStockCsv();

