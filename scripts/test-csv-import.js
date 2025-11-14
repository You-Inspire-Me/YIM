#!/usr/bin/env node

/**
 * Test CSV import directly via backend
 */

const fs = require('fs');
const mongoose = require('mongoose');
const Papa = require('papaparse');

// Mock auth request
const mockUserId = new mongoose.Types.ObjectId();

async function testImport() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:27017/ecommerce-zalando';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Read CSV
    const csvPath = './pim-import.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('✅ CSV file read');

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim()
    });

    console.log(`✅ CSV parsed: ${parseResult.data.length} rows`);

    const db = mongoose.connection.db;
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const Variant = mongoose.model('Variant', new mongoose.Schema({}, { strict: false }));

    let success = 0;
    let errors = [];

    // Process each row
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2;

      try {
        const sku = row.sku?.trim();
        const size = row.variant_size?.trim();
        const color = row.variant_color?.trim();
        const priceExclVat = parseFloat((row.price_excl_vat || '1.00').replace(',', '.'));

        if (!sku || !size || !color) {
          errors.push({ row: rowNum, error: 'Missing required fields' });
          continue;
        }

        if (priceExclVat <= 0) {
          errors.push({ row: rowNum, error: 'price_excl_vat must be > 0' });
          continue;
        }

        // Find or create product
        let product = await Product.findOne({ sku }).lean();
        let productId;

        if (!product) {
          const newProduct = {
            sku,
            title: `${sku} - Product`,
            description: `Product ${sku} imported from CSV`,
            category: 'all',
            images: [],
            variants: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const insertResult = await db.collection('products').insertOne(newProduct);
          productId = insertResult.insertedId;
          product = { ...newProduct, _id: productId };
          console.log(`  Row ${rowNum}: Created product ${sku}`);
        } else {
          productId = product._id;
          
          // Fix category if needed
          const validCategories = ['dames', 'heren', 'kinderen', 'all'];
          if (!product.category || !validCategories.includes(product.category)) {
            await db.collection('products').updateOne(
              { _id: productId },
              { $set: { category: 'all' } }
            );
            console.log(`  Row ${rowNum}: Fixed category for ${sku}`);
          }
        }

        // Find or create variant
        let variant = await Variant.findOne({ productId, size, color }).lean();

        if (!variant) {
          const variantData = {
            productId,
            size,
            color,
            images: [],
            weight: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const insertResult = await db.collection('variants').insertOne(variantData);
          variant = { ...variantData, _id: insertResult.insertedId };
          console.log(`  Row ${rowNum}: Created variant ${size}/${color}`);

          // Add variant to product
          await db.collection('products').updateOne(
            { _id: productId },
            {
              $addToSet: { variants: variant._id },
              $set: { category: 'all' }
            }
          );
        }

        // Create or update CreatorListing
        const listingSku = `${sku}-${size}-${color}`;
        const vatRate = 21;
        const priceInclVat = priceExclVat * 1.21;

        const listingData = {
          creatorId: mockUserId,
          productId,
          variantId: variant._id,
          sku: listingSku,
          priceExclVat,
          priceInclVat,
          vatRate,
          stock: parseInt(row.stock || '0'),
          costPrice: null,
          supplier: null,
          active: true,
          posSystem: 'none',
          posExternalId: null,
          posSync: false,
          lastPosSync: null,
          updatedAt: new Date()
        };

        const listingCollection = db.collection('creatorlistings');
        const listingFilter = {
          creatorId: mockUserId,
          productId,
          variantId: variant._id
        };

        const existingListing = await listingCollection.findOne(listingFilter);

        if (existingListing) {
          await listingCollection.updateOne(listingFilter, { $set: listingData });
        } else {
          await listingCollection.insertOne({
            ...listingData,
            createdAt: new Date()
          });
        }

        success++;
        if (success % 10 === 0) {
          console.log(`  Progress: ${success}/${parseResult.data.length}`);
        }
      } catch (error) {
        errors.push({
          row: rowNum,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`  Row ${rowNum} ERROR:`, error.message);
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`   Success: ${success}`);
    console.log(`   Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log(`\n   First 10 errors:`);
      errors.slice(0, 10).forEach(e => {
        console.log(`     Row ${e.row}: ${e.error}`);
      });
    }

    await mongoose.disconnect();
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

testImport();

