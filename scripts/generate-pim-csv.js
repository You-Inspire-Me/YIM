#!/usr/bin/env node

/**
 * Script to generate PIM CSV from merchantSku list
 * 
 * Usage: node scripts/generate-pim-csv.js <input.csv> <output.csv>
 * 
 * Input CSV should have a column "merchantSku" (or "sku")
 * Output CSV will have: sku,variant_size,variant_color,price_excl_vat,stock
 * 
 * This CSV can be used with the CreatorListing import which auto-creates products and variants
 */

const fs = require('fs');
const path = require('path');

// Simple CSV parser (no external dependency)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { data: [], errors: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === 0 || values.every(v => !v)) continue;
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    data.push(row);
  }
  
  return { data, errors: [] };
}

function unparseCSV(data, columns) {
  const headers = columns.join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col] || '';
      // Escape if contains comma or quote
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

// Parse merchantSku to extract product info
// Examples: "TS001-S-WHT" -> { productCode: "TS001", size: "S", color: "WHT" }
function parseMerchantSku(merchantSku) {
  const cleaned = merchantSku.toString().trim().replace(/,$/, ''); // Remove trailing comma
  const parts = cleaned.split('-');
  
  if (parts.length >= 3) {
    // Pattern: [PRODUCT]-[SIZE]-[COLOR]
    return {
      productCode: parts[0],
      size: parts[parts.length - 2],
      color: parts[parts.length - 1]
    };
  } else if (parts.length === 2) {
    // Pattern: [PRODUCT]-[SIZE] (no color)
    return {
      productCode: parts[0],
      size: parts[1],
      color: ''
    };
  }
  
  return {
    productCode: cleaned,
    size: '',
    color: ''
  };
}

// Map color codes to full names
const colorMap = {
  'WHT': 'White',
  'BLK': 'Black',
  'GRY': 'Grey',
  'NAV': 'Navy',
  'PNK': 'Pink',
  'BL': 'Blue',
  'OL': 'Olive',
  'FL': 'Floral',
  'DE': 'Denim',
  'RE': 'Red',
  'WH': 'White',
  'GR': 'Green',
  'BR': 'Brown',
  'WI': 'Wine',
  'B': 'Blue',
  'V': 'Violet',
  'F': 'Floral',
  'L': 'Lavender',
  'G': 'Green',
  'N': 'Navy',
  'D': 'Denim',
  'C': 'Cream',
  'E': 'Ecru',
  'R': 'Red',
  'H': 'Honey',
  'I': 'Ivory',
  'O': 'Orange',
  'S': 'Silver',
  'T': 'Tan',
  'W': 'White'
};

function normalizeColor(colorCode) {
  const upper = colorCode.toUpperCase();
  return colorMap[upper] || colorCode;
}

function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3] || 'pim-import.csv';
  
  if (!inputFile) {
    console.error('Usage: node scripts/generate-pim-csv.js <input.csv> [output.csv]');
    console.error('Example: node scripts/generate-pim-csv.js merchantSku-list.csv pim-import.csv');
    process.exit(1);
  }
  
  console.log(`Reading from: ${inputFile}`);
  console.log(`Writing to: ${outputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(inputFile, 'utf-8');
  
  // Parse CSV
  const parseResult = parseCSV(csvContent);
  
  if (parseResult.errors.length > 0) {
    console.warn('CSV parsing warnings:', parseResult.errors);
  }
  
  // Normalize headers
  const normalizedData = parseResult.data.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const lower = key.toLowerCase().trim();
      if (lower === 'merchantsku' || lower === 'merchant_sku' || lower === 'sku') {
        normalized.merchantSku = row[key];
      } else {
        normalized[key] = row[key];
      }
    });
    return normalized;
  });
  
  // Group by product code
  const productMap = new Map();
  
  for (const row of normalizedData) {
    const merchantSku = row.merchantSku || row.merchant_sku || row.sku;
    if (!merchantSku) continue;
    
    const parsed = parseMerchantSku(merchantSku);
    const productCode = parsed.productCode;
    
    if (!productMap.has(productCode)) {
      productMap.set(productCode, []);
    }
    
    productMap.get(productCode).push({
      sku: productCode, // Use product code as SKU
      variant_size: parsed.size || 'OS',
      variant_color: normalizeColor(parsed.color) || 'Default',
      price_excl_vat: '', // Leave empty - set in UI
      stock: 0 // Leave empty or set default
    });
  }
  
  // Flatten to rows
  const outputRows = [];
  for (const [productCode, variants] of productMap.entries()) {
    for (const variant of variants) {
      outputRows.push(variant);
    }
  }
  
  // Generate CSV
  const outputCsv = unparseCSV(outputRows, ['sku', 'variant_size', 'variant_color', 'price_excl_vat', 'stock']);
  
  fs.writeFileSync(outputFile, outputCsv, 'utf-8');
  
  console.log(`\n✅ Generated ${outputRows.length} rows for ${productMap.size} products`);
  console.log(`\nProducts found:`);
  for (const [productCode, variants] of productMap.entries()) {
    console.log(`  - ${productCode}: ${variants.length} variant(s)`);
  }
  console.log(`\n📄 CSV saved to: ${outputFile}`);
  console.log(`\nYou can now import this CSV using the CreatorListing import (which auto-creates products and variants)`);
}

main();

