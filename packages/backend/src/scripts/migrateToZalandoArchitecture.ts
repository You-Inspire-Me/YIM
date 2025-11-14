import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { ProductMasterModel } from '../models/ProductMaster.js';
import { ProductVariantModel } from '../models/ProductVariant.js';
import { MerchantModel } from '../models/Merchant.js';
import { MerchantOfferModel } from '../models/MerchantOffer.js';
import { MerchantPriceModel } from '../models/MerchantPrice.js';
import { MerchantStockModel } from '../models/MerchantStock.js';
import { LocationModel } from '../models/Location.js';
import { MediaModel } from '../models/Media.js';
import { ProductModel } from '../models/Product.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { UserModel } from '../models/User.js';

/**
 * Migration script: Move from old structure to Zalando-grade architecture
 * 
 * Old: Product (with price/stock) → CreatorListing
 * New: ProductMaster → ProductVariant → MerchantOffer → MerchantPrice / MerchantStock
 */
const migrateToZalandoArchitecture = async (): Promise<void> => {
  console.log('🔄 Starting migration to Zalando-grade architecture...\n');

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Step 1: Migrate Products to ProductMaster + ProductVariant
    console.log('📦 Step 1: Migrating Products to ProductMaster + ProductVariant...');
    const oldProducts = await ProductModel.find({}).lean();
    let productsMigrated = 0;

    for (const oldProduct of oldProducts) {
      try {
        // Create Media entries for images
        const imageIds: mongoose.Types.ObjectId[] = [];
        if (oldProduct.images && Array.isArray(oldProduct.images)) {
          for (const imageUrl of oldProduct.images) {
            const media = await MediaModel.create({
              url: imageUrl,
              type: 'image',
              altText: oldProduct.title
            });
            imageIds.push(media._id as mongoose.Types.ObjectId);
          }
        }

        // Create ProductMaster
        const productMaster = await ProductMasterModel.create({
          modelId: oldProduct.sku || `MIG-${oldProduct._id}`,
          title: oldProduct.title,
          descriptionHtml: oldProduct.description || oldProduct.title,
          brandId: (oldProduct as any).brand || 'UNKNOWN',
          vendorCode: (oldProduct as any).vendorCode || 'MIG',
          categoryId: new mongoose.Types.ObjectId(), // Default category
          status: 'published',
          canonicalImageId: imageIds[0],
          metafields: oldProduct.specs || {},
          publishedAt: oldProduct.createdAt || new Date()
        });

        // Create ProductVariant(s)
        if ((oldProduct as any).variants && Array.isArray((oldProduct as any).variants)) {
          // Has variants
          for (const oldVariant of (oldProduct as any).variants) {
            await ProductVariantModel.create({
              masterId: productMaster._id,
              sku: oldVariant.sku || `${oldProduct.sku}-${oldVariant.size}-${oldVariant.color}`,
              ean: oldVariant.ean || oldVariant.barcode,
              size: oldVariant.size || '',
              colorCode: oldVariant.color || '',
              material: oldVariant.material,
              weight: oldVariant.weight || 0,
              images: imageIds,
              attributes: {}
            });
          }
        } else {
          // No variants - create single variant
          await ProductVariantModel.create({
            masterId: productMaster._id,
            sku: oldProduct.sku || `MIG-${oldProduct._id}`,
            ean: (oldProduct as any).ean,
            size: '',
            colorCode: '',
            weight: 0,
            images: imageIds,
            attributes: {}
          });
        }

        productsMigrated++;
        console.log(`  ✅ Migrated product: ${oldProduct.title}`);
      } catch (error) {
        console.error(`  ❌ Error migrating product ${oldProduct._id}:`, error);
      }
    }

    console.log(`✅ Products migration complete: ${productsMigrated} products\n`);

    // Step 2: Migrate CreatorListings to MerchantOffer + MerchantPrice + MerchantStock
    console.log('💰 Step 2: Migrating CreatorListings to MerchantOffer + Price + Stock...');
    const oldListings = await CreatorListingModel.find({}).lean();
    let listingsMigrated = 0;

    for (const oldListing of oldListings) {
      try {
        // Find corresponding ProductVariant
        const oldProduct = await ProductModel.findById(oldListing.productId);
        if (!oldProduct) {
          console.log(`  ⚠️  Product not found for listing ${oldListing._id}, skipping`);
          continue;
        }

        // Find ProductMaster by old product SKU
        const productMaster = await ProductMasterModel.findOne({
          modelId: oldProduct.sku
        });

        if (!productMaster) {
          console.log(`  ⚠️  ProductMaster not found for listing ${oldListing._id}, skipping`);
          continue;
        }

        // Find ProductVariant
        const variant = await ProductVariantModel.findOne({
          masterId: productMaster._id,
          size: (oldListing.variantId as any).size || '',
          colorCode: (oldListing.variantId as any).color || ''
        });

        if (!variant) {
          console.log(`  ⚠️  Variant not found for listing ${oldListing._id}, skipping`);
          continue;
        }

        // Find or create Merchant
        let merchant = await MerchantModel.findOne({ merchantId: oldListing.creatorId });
        if (!merchant) {
          const user = await UserModel.findById(oldListing.creatorId);
          if (!user) {
            console.log(`  ⚠️  User not found for listing ${oldListing._id}, skipping`);
            continue;
          }

          merchant = await MerchantModel.create({
            merchantId: user._id,
            name: user.profile.name || user.email,
            legalEntity: user.profile.name || user.email,
            country: user.profile.address?.country || 'NL',
            active: true
          });
        }

        // Create MerchantOffer
        const offer = await MerchantOfferModel.create({
          merchantId: merchant._id,
          variantId: variant._id,
          merchantSku: oldListing.sku,
          status: oldListing.active ? 'active' : 'paused',
          listingCountries: ['NL']
        });

        // Create MerchantPrice
        await MerchantPriceModel.create({
          offerId: offer._id,
          currency: 'EUR',
          basePrice: oldListing.priceExclVat || 0,
          effectivePrice: oldListing.priceInclVat || oldListing.priceExclVat || 0,
          validFrom: new Date(),
          source: 'merchant'
        });

        // Create default Location if needed
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
            address: merchant.country || 'NL',
            timezone: 'Europe/Amsterdam',
            active: true
          });
        }

        // Create MerchantStock
        await MerchantStockModel.create({
          offerId: offer._id,
          locationId: location._id,
          availableQty: oldListing.stock || 0,
          incomingQty: 0,
          reservedQty: 0,
          posSystem: (oldListing as any).posSystem || 'none',
          posExternalId: (oldListing as any).posExternalId
        });

        listingsMigrated++;
        console.log(`  ✅ Migrated listing: ${oldListing.sku}`);
      } catch (error) {
        console.error(`  ❌ Error migrating listing ${oldListing._id}:`, error);
      }
    }

    console.log(`✅ Listings migration complete: ${listingsMigrated} listings\n`);

    console.log('✅ Migration complete!');
    console.log('\n⚠️  Note: Old Product and CreatorListing documents are kept for reference.');
    console.log('⚠️  You can delete them after verifying the migration.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

// Run migration if called directly
void migrateToZalandoArchitecture();

