/**
 * Migration script: Convert existing data to multi-vendor structure
 * 
 * This script migrates:
 * 1. Products (with variants) -> Global Products + Variants + CreatorListings
 * 2. Orders -> New Order structure with listingId
 * 3. Looks -> Update to use global Product + Variant
 * 4. Users -> Update role 'host' to 'creator'
 * 
 * Run with: npm run migrate
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { DiscountModel } from '../models/Discount.js';
import { LookModel } from '../models/Look.js';
import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { ReturnModel } from '../models/Return.js';
import { UserModel } from '../models/User.js';
import { VariantModel } from '../models/Variant.js';

const migrateProducts = async (): Promise<void> => {
  console.log('🔄 Migrating Products...');

  // Get all products (check for old structure with 'host' field)
  const oldProducts = await ProductModel.find({ host: { $exists: true } }).lean();

  let migrated = 0;
  let skipped = 0;

  for (const oldProduct of oldProducts) {
    try {
      // Check if already migrated (has new structure - no host field)
      if (!(oldProduct as any).host) {
        console.log(`⏭️  Product ${oldProduct._id} already migrated, skipping`);
        skipped++;
        continue;
      }

      const creatorId = (oldProduct as any).host;
      const oldPrice = (oldProduct as any).price || 0;

      // Create global Product
      const globalProduct = await ProductModel.create({
        sku: (oldProduct as any).sku || `MIG-${oldProduct._id}`,
        ean: undefined,
        title: oldProduct.title,
        description: oldProduct.description,
        category: oldProduct.category || 'all',
        images: oldProduct.images || [],
        specs: {
          maat: undefined,
          kleur: undefined,
          materiaal: undefined
        },
        basePrice: oldPrice,
        vatRate: 21,
        variants: []
      });

      // Create variants from old product variants
      if ((oldProduct as any).variants && (oldProduct as any).variants.length > 0) {
        const variantIds: mongoose.Types.ObjectId[] = [];

        for (const oldVariant of (oldProduct as any).variants) {
          const variant = await VariantModel.create({
            productId: globalProduct._id as mongoose.Types.ObjectId,
            size: oldVariant.size || '',
            color: oldVariant.color || '',
            images: [],
            weight: 0,
            barcode: oldVariant.barcode
          });

          variantIds.push(variant._id as mongoose.Types.ObjectId);

          // Create CreatorListing for this variant
          await CreatorListingModel.create({
            creatorId,
            productId: globalProduct._id,
            variantId: variant._id,
            sku: oldVariant.sku || `${globalProduct.sku}-${variant.size}-${variant.color}`,
            priceExclVat: oldVariant.priceExclVat || oldPrice,
            priceInclVat: oldVariant.priceInclVat || oldPrice,
            stock: oldVariant.stock || 0,
            costPrice: oldVariant.costPrice,
            supplier: oldVariant.supplier,
            active: oldVariant.active !== undefined ? oldVariant.active : true
          });
        }

        globalProduct.variants = variantIds as mongoose.Types.ObjectId[];
        await globalProduct.save();
      } else {
        // No variants: create single variant from product
        const variant = await VariantModel.create({
          productId: globalProduct._id,
          size: '',
          color: '',
          images: [],
          weight: 0,
          barcode: undefined
        });

        globalProduct.variants = [variant._id as mongoose.Types.ObjectId];
        await globalProduct.save();

        // Create CreatorListing
        await CreatorListingModel.create({
          creatorId,
          productId: globalProduct._id,
          variantId: variant._id,
          sku: globalProduct.sku,
          priceExclVat: oldPrice,
          priceInclVat: oldPrice,
          stock: (oldProduct as any).inventory || 0,
          active: (oldProduct as any).active !== undefined ? (oldProduct as any).active : true
        });
      }

      migrated++;
      console.log(`✅ Migrated product: ${oldProduct.title} (${globalProduct.sku})`);
    } catch (error) {
      console.error(`❌ Error migrating product ${oldProduct._id}:`, error);
    }
  }

  console.log(`✅ Products migration complete: ${migrated} migrated, ${skipped} skipped`);
};

const migrateUsers = async (): Promise<void> => {
  console.log('🔄 Migrating Users...');

  const result = await UserModel.updateMany(
    { role: 'host' },
    { $set: { role: 'creator' } }
  );

  console.log(`✅ Users migration complete: ${result.modifiedCount} users updated (host -> creator)`);
};

const migrateLooks = async (): Promise<void> => {
  console.log('🔄 Migrating Looks...');

  const looks = await LookModel.find({}).lean();
  let migrated = 0;

  for (const look of looks) {
    try {
      const creatorId = (look as any).host;

      // Update look to use creatorId instead of host
      await LookModel.updateOne(
        { _id: look._id },
        {
          $set: {
            creatorId,
            likes: 0
          },
          $unset: {
            host: 1
          }
        }
      );

      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating look ${look._id}:`, error);
    }
  }

  console.log(`✅ Looks migration complete: ${migrated} looks migrated`);
};

const main = async (): Promise<void> => {
  try {
    console.log('🚀 Starting migration to multi-vendor structure...\n');

    await connectDatabase();
    console.log('✅ Database connected\n');

    await migrateUsers();
    console.log('');

    await migrateProducts();
    console.log('');

    await migrateLooks();
    console.log('');

    console.log('✅ Migration complete!');
    console.log('\n⚠️  Note: Orders and Returns will need manual migration or will be handled by new checkout flow.');
    console.log('⚠️  Old Product documents are kept for reference. You can delete them after verifying migration.');

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
void main();

