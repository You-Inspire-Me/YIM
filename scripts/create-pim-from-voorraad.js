/**
 * Create PIM products and variants from voorraad.csv
 * This script extracts unique products and variants from the stock CSV
 * and creates them in PIM before importing stock
 */

const fs = require('fs');
const Papa = require('papaparse');
const mongoose = require('mongoose');

// Import models
const ProductMasterModel = require('../packages/backend/dist/models/ProductMaster.js').default;
const ProductVariantModel = require('../packages/backend/dist/models/ProductVariant.js').default;
const MediaModel = require('../packages/backend/dist/models/Media.js').default;

const CSV_FILE = '/Users/dremy/Downloads/voorraad.csv';

// Product name mapping based on SKU prefix
const PRODUCT_NAMES = {
  'TS': 'T-Shirt',
  'HOOD': 'Hoodie',
  'JNS': 'Jeans',
  'SNK': 'Sneakers',
  'CAP': 'Cap',
  'BAG': 'Bag',
  'NEC': 'Necklace',
  'EAR': 'Earrings',
  'JKT': 'Jacket',
  'DRS': 'Dress',
  'SKT': 'Skirt',
  'SOCK': 'Socks',
  'BLT': 'Belt',
  'SH': 'Shirt',
  'PNT': 'Pants',
  'SHT': 'Shirt',
  'BLZ': 'Blazer',
  'SWT': 'Sweater',
  'TNK': 'Tank Top',
  'WTC': 'Watch',
  'BRC': 'Bracelet',
  'RNG': 'Ring',
  'BNE': 'Bone',
  'SCF': 'Scarf',
  'GLV': 'Gloves',
  'SNG': 'Sunglasses'
};

function extractProductCode(merchantSku) {
  // Extract product code from merchantSku (e.g., "TS001-S-WHT" -> "TS001")
  const match = merchantSku.match(/^([A-Z]+[0-9]+)/);
  return match ? match[1] : null;
}

function getProductName(productCode) {
  // Get product name from code (e.g., "TS001" -> "T-Shirt")
  const prefix = productCode.match(/^([A-Z]+)/)?.[1] || '';
  return PRODUCT_NAMES[prefix] || 'Product';
}

async function createPIMFromCSV() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/yim');
      console.log('✅ Connected to MongoDB');
    }

    // Read CSV
    console.log(`📄 Reading CSV: ${CSV_FILE}`);
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    console.log(`📊 Parsed ${parseResult.data.length} rows`);

    // Group by product code
    const productsMap = new Map(); // productCode -> { variants: Set, sizes: Set, colors: Set }

    for (const row of parseResult.data) {
      const merchantSku = (row.merchantSku || row.merchant_sku || '').trim();
      const size = (row.variant_size || row.size || '').trim();
      const color = (row.variant_color || row.color || '').trim();

      if (!merchantSku || !size || !color) continue;

      const productCode = extractProductCode(merchantSku);
      if (!productCode) continue;

      if (!productsMap.has(productCode)) {
        productsMap.set(productCode, {
          variants: new Set(),
          sizes: new Set(),
          colors: new Set()
        });
      }

      const product = productsMap.get(productCode);
      product.variants.add(`${size}/${color}`);
      product.sizes.add(size);
      product.colors.add(color);
    }

    console.log(`\n📦 Found ${productsMap.size} unique products`);

    // Create products and variants
    let createdProducts = 0;
    let createdVariants = 0;
    let skippedProducts = 0;
    let skippedVariants = 0;

    for (const [productCode, data] of productsMap.entries()) {
      try {
        // Check if ProductMaster already exists
        let productMaster = await ProductMasterModel.findOne({ 
          $or: [
            { modelId: productCode },
            { vendorCode: productCode }
          ]
        });

        if (!productMaster) {
          // Create ProductMaster
          const productName = getProductName(productCode);
          productMaster = await ProductMasterModel.create({
            modelId: productCode,
            title: `${productName} ${productCode}`,
            descriptionHtml: `<p>${productName} ${productCode}</p>`,
            brandId: 'YIM',
            vendorCode: productCode,
            status: 'active',
            metafields: {}
          });
          createdProducts++;
          console.log(`✅ Created ProductMaster: ${productCode}`);
        } else {
          skippedProducts++;
          console.log(`⏭️  ProductMaster already exists: ${productCode}`);
        }

        // Create variants
        for (const variantKey of data.variants) {
          const [size, color] = variantKey.split('/');
          
          // Check if variant already exists
          const existingVariant = await ProductVariantModel.findOne({
            masterId: productMaster._id,
            size: size.trim(),
            colorCode: color.trim()
          });

          if (!existingVariant) {
            // Generate SKU for variant
            const variantSku = `${productCode}-${size.trim()}-${color.trim().substring(0, 3).toUpperCase()}`;
            
            await ProductVariantModel.create({
              masterId: productMaster._id,
              sku: variantSku,
              size: size.trim(),
              colorCode: color.trim(),
              images: [],
              attributes: {}
            });
            createdVariants++;
            console.log(`  ✅ Created variant: ${size} / ${color}`);
          } else {
            skippedVariants++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${productCode}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Created ${createdProducts} products`);
    console.log(`  ✅ Created ${createdVariants} variants`);
    console.log(`  ⏭️  Skipped ${skippedProducts} existing products`);
    console.log(`  ⏭️  Skipped ${skippedVariants} existing variants`);

    console.log(`\n✅ PIM creation complete! You can now import stock.`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

createPIMFromCSV();

