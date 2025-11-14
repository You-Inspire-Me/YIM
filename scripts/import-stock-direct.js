/**
 * Direct import script - runs inside Docker container
 * Usage: docker-compose exec backend node /app/scripts/import-stock-direct.js
 */

const fs = require('fs');
const mongoose = require('mongoose');
const Papa = require('papaparse');

// Import models (adjust paths as needed)
const path = require('path');
const MerchantModel = require('../packages/backend/dist/models/Merchant.js').default;
const MerchantOfferModel = require('../packages/backend/dist/models/MerchantOffer.js').default;
const MerchantStockModel = require('../packages/backend/dist/models/MerchantStock.js').default;
const ProductVariantModel = require('../packages/backend/dist/models/ProductVariant.js').default;
const LocationModel = require('../packages/backend/dist/models/Location.js').default;
const UserModel = require('../packages/backend/dist/models/User.js').default;

const CSV_FILE = '/Users/dremy/Downloads/voorraad.csv';

async function importStock() {
  try {
    // Connect to MongoDB (assuming it's already connected in the app)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/yim');
    }

    // Find creator user
    const creator = await UserModel.findOne({ role: 'creator' });
    if (!creator) {
      console.error('❌ No creator user found. Please create one first.');
      process.exit(1);
    }

    console.log(`✅ Found creator: ${creator.email}`);

    // Find or create merchant
    let merchant = await MerchantModel.findOne({ userId: creator._id });
    if (!merchant) {
      console.log('Creating merchant for creator...');
      merchant = await MerchantModel.create({
        userId: creator._id,
        businessName: creator.profile?.name || 'My Store',
        country: 'NL'
      });
    }

    console.log(`✅ Using merchant: ${merchant._id}`);

    // Read CSV
    console.log(`📄 Reading CSV: ${CSV_FILE}`);
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const normalized = header.trim().toLowerCase();
        const headerMap = {
          merchant_sku: 'merchantSku',
          merchantsku: 'merchantSku',
          'merchant sku': 'merchantSku',
          sku: 'merchantSku',
          variant_size: 'variant_size',
          'variant size': 'variant_size',
          size: 'variant_size',
          variant_color: 'variant_color',
          'variant color': 'variant_color',
          color: 'variant_color',
          stock: 'stock',
          location_type: 'location_type',
          'location type': 'location_type',
          location: 'location_type',
          pos_system: 'pos_system',
          'pos system': 'pos_system',
          pos_external_id: 'pos_external_id',
          'pos external id': 'pos_external_id'
        };
        return headerMap[normalized] || normalized;
      }
    });

    console.log(`📊 Parsed ${parseResult.data.length} rows`);

    // Get default location
    let location = await LocationModel.findOne({
      merchantId: merchant._id,
      type: 'warehouse',
      active: true
    });

    if (!location) {
      location = await LocationModel.create({
        merchantId: merchant._id,
        type: 'warehouse',
        name: 'Main Warehouse',
        address: 'NL',
        timezone: 'Europe/Amsterdam'
      });
    }

    const success = [];
    const errors = [];

    // Process each row
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2;

      try {
        const merchantSku = (row.merchantSku || row.merchant_sku || '').trim();
        const variant_size = (row.variant_size || row.size || '').trim();
        const variant_color = (row.variant_color || row.color || '').trim();
        const stock = parseInt(row.stock || '0', 10);
        const location_type = (row.location_type || 'warehouse').trim();

        if (!merchantSku) {
          errors.push({ row: rowNum, error: 'Missing merchantSku' });
          continue;
        }

        // Find offer
        let offer = await MerchantOfferModel.findOne({
          merchantId: merchant._id,
          merchantSku
        }).populate('variantId');

        if (!offer) {
          // Try to find variant
          const variant = await ProductVariantModel.findOne({
            size: variant_size,
            colorCode: variant_color
          });

          if (!variant) {
            errors.push({
              row: rowNum,
              error: `Variant not found: ${variant_size} / ${variant_color}. Create in PIM first.`
            });
            continue;
          }

          // Create offer
          offer = await MerchantOfferModel.create({
            merchantId: merchant._id,
            variantId: variant._id,
            merchantSku
          });
        }

        // Find or create location
        let stockLocation = await LocationModel.findOne({
          merchantId: merchant._id,
          type: location_type
        });

        if (!stockLocation) {
          stockLocation = await LocationModel.create({
            merchantId: merchant._id,
            type: location_type,
            name: location_type === 'warehouse' ? 'Main Warehouse' : 'Store',
            address: 'NL',
            timezone: 'Europe/Amsterdam'
          });
        }

        // Update or create stock
        await MerchantStockModel.findOneAndUpdate(
          {
            offerId: offer._id,
            locationId: stockLocation._id
          },
          {
            quantity: stock,
            reserved: 0,
            available: stock
          },
          { upsert: true, new: true }
        );

        success.push({ merchantSku, variant: `${variant_size}/${variant_color}` });
        console.log(`✅ Row ${rowNum}: ${merchantSku} → ${stock} units`);

      } catch (err) {
        errors.push({
          row: rowNum,
          error: err.message || 'Unknown error'
        });
        console.error(`❌ Row ${rowNum} error:`, err.message);
      }
    }

    console.log(`\n📊 Import complete:`);
    console.log(`✅ Success: ${success.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nFirst 10 errors:');
      errors.slice(0, 10).forEach(err => {
        console.log(`  Row ${err.row}: ${err.error}`);
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

importStock();

