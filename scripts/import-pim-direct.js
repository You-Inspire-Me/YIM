#!/usr/bin/env node
/**
 * Direct database import of PIM data from CSV
 * Creates ProductMaster and ProductVariant entries
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/zalando';
const CSV_FILE = path.join(__dirname, '../pim-import.csv');

// ProductMaster Schema
const ProductMasterSchema = new mongoose.Schema({
  masterId: { type: String, unique: true, default: () => uuidv4() },
  modelId: String,
  title: String,
  descriptionHtml: String,
  brandId: String,
  vendorCode: String,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  metafields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'productmasters' });

// ProductVariant Schema
const ProductVariantSchema = new mongoose.Schema({
  variantId: { type: String, unique: true, default: () => uuidv4() },
  masterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductMaster', required: true },
  sku: String,
  size: String,
  colorCode: String,
  images: [String],
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'productvariants' });

const ProductMasterModel = mongoose.model('ProductMaster', ProductMasterSchema);
const ProductVariantModel = mongoose.model('ProductVariant', ProductVariantSchema);

function getProductName(productCode) {
  const prefix = productCode.substring(0, 3);
  const PRODUCT_NAMES = {
    'BAG': 'Bag',
    'BLT': 'Belt',
    'BLZ': 'Blazer',
    'BNE': 'Beanie',
    'BRC': 'Bracelet',
    'CAP': 'Cap',
    'DRS': 'Dress',
    'JKT': 'Jacket',
    'JNS': 'Jeans',
    'PNT': 'Pants',
    'SHO': 'Shorts',
    'SHI': 'Shirt',
    'SNK': 'Sneakers',
    'SOC': 'Socks',
    'SWT': 'Sweater',
    'TSH': 'T-Shirt',
    'TOP': 'Top',
    'TRS': 'Trousers',
    'VST': 'Vest',
    'WTC': 'Watch'
  };
  return PRODUCT_NAMES[prefix] || 'Product';
}

async function importPIM() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`📄 Reading CSV: ${CSV_FILE}`);
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    console.log(`📊 Parsed ${parseResult.data.length} rows\n`);

    // Group by product SKU (product code)
    const productsMap = new Map(); // sku -> { variants: Set, sizes: Set, colors: Set }

    for (const row of parseResult.data) {
      const sku = (row.sku || '').trim();
      const size = (row.variant_size || '').trim();
      const color = (row.variant_color || '').trim();

      if (!sku || !size || !color) {
        console.warn(`⚠️  Skipping row with missing data: ${JSON.stringify(row)}`);
        continue;
      }

      if (!productsMap.has(sku)) {
        productsMap.set(sku, {
          variants: new Set(),
          sizes: new Set(),
          colors: new Set()
        });
      }

      const product = productsMap.get(sku);
      product.variants.add(`${size}/${color}`);
      product.sizes.add(size);
      product.colors.add(color);
    }

    console.log(`📦 Found ${productsMap.size} unique products\n`);

    // Create products and variants
    let createdProducts = 0;
    let createdVariants = 0;
    let skippedProducts = 0;
    let skippedVariants = 0;

    for (const [sku, data] of productsMap.entries()) {
      try {
        // Check if ProductMaster already exists
        let productMaster = await ProductMasterModel.findOne({ 
          $or: [
            { modelId: sku },
            { vendorCode: sku }
          ]
        });

        if (!productMaster) {
          // Create ProductMaster
          const productName = getProductName(sku);
          productMaster = await ProductMasterModel.create({
            masterId: uuidv4(),
            modelId: sku,
            title: `${productName} ${sku}`,
            descriptionHtml: `<p>${productName} ${sku}</p>`,
            brandId: 'YIM',
            vendorCode: sku,
            status: 'active',
            categoryId: new mongoose.Types.ObjectId(),
            metafields: {}
          });
          createdProducts++;
          console.log(`✅ Created ProductMaster: ${sku}`);
        } else {
          skippedProducts++;
          console.log(`⏭️  ProductMaster already exists: ${sku}`);
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
            const variantSku = `${sku}-${size.trim()}-${color.trim().substring(0, 3).toUpperCase()}`;
            
            await ProductVariantModel.create({
              variantId: uuidv4(),
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
        console.error(`❌ Error processing ${sku}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Products created: ${createdProducts}`);
    console.log(`  Products skipped: ${skippedProducts}`);
    console.log(`  Variants created: ${createdVariants}`);
    console.log(`  Variants skipped: ${skippedVariants}`);

    await mongoose.disconnect();
    console.log('\n✅ Import completed!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importPIM();

