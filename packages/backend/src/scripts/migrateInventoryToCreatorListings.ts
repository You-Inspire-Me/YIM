import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';
import { UserModel } from '../models/User.js';

/**
 * Migration script: Move price/stock from old Product model to CreatorListing
 * 
 * This script:
 * 1. Finds all Products with old structure (has basePrice/vatRate or host field)
 * 2. Creates CreatorListings for each product/variant combination
 * 3. Removes basePrice/vatRate from Product schema
 */
const migrateInventoryToCreatorListings = async (): Promise<void> => {
  console.log('🔄 Starting migration: Product price/stock → CreatorListing...\n');

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Find all products that might have old structure
    // Check for products that have basePrice (old field) or are referenced in old way
    const oldProducts = await ProductModel.find({
      $or: [
        { basePrice: { $exists: true } },
        { vatRate: { $exists: true } }
      ]
    }).lean();

    console.log(`Found ${oldProducts.length} products with old structure\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of oldProducts) {
      try {
        const oldProduct = product as any;

        // Skip if no basePrice (already migrated or new structure)
        if (!oldProduct.basePrice) {
          console.log(`⏭️  Product ${product._id} has no basePrice, skipping`);
          skipped++;
          continue;
        }

        // Find creator (if product had host field, use that)
        // Otherwise, we need to find a creator - for now, skip products without creator
        let creatorId = oldProduct.host;
        
        if (!creatorId) {
          console.log(`⚠️  Product ${product._id} has no creator (host), skipping`);
          skipped++;
          continue;
        }

        // Verify creator exists
        const creator = await UserModel.findById(creatorId);
        if (!creator || creator.role !== 'creator') {
          console.log(`⚠️  Creator ${creatorId} not found or not a creator, skipping product ${product._id}`);
          skipped++;
          continue;
        }

        // Get variants for this product
        const variants = await VariantModel.find({ productId: product._id });

        if (variants.length === 0) {
          // No variants: create single variant and listing
          const variant = await VariantModel.create({
            productId: product._id,
            size: '',
            color: '',
            images: [],
            weight: 0
          });

          await CreatorListingModel.create({
            creatorId,
            productId: product._id,
            variantId: variant._id,
            sku: oldProduct.sku || `MIG-${product._id}`,
            priceExclVat: oldProduct.basePrice || 0,
            priceInclVat: (oldProduct.basePrice || 0) * (1 + (oldProduct.vatRate || 21) / 100),
            vatRate: oldProduct.vatRate || 21,
            stock: oldProduct.inventory || 0,
            active: oldProduct.active !== false
          });

          // Update product to remove old fields
          await ProductModel.updateOne(
            { _id: product._id },
            {
              $unset: {
                basePrice: 1,
                vatRate: 1,
                inventory: 1,
                host: 1
              },
              $set: {
                variants: [variant._id]
              }
            }
          );

          migrated++;
          console.log(`✅ Migrated product: ${product.title || product._id}`);
        } else {
          // Has variants: create listing for each variant
          for (const variant of variants) {
            // Check if listing already exists
            const existingListing = await CreatorListingModel.findOne({
              creatorId,
              productId: product._id,
              variantId: variant._id
            });

            if (existingListing) {
              console.log(`⏭️  Listing already exists for variant ${variant._id}, skipping`);
              continue;
            }

            // Get variant-specific price/stock from old variant structure if available
            const oldVariant = (oldProduct.variants || []).find(
              (v: any) => v.size === variant.size && v.color === variant.color
            );

            const priceExclVat = oldVariant?.priceExclVat || oldProduct.basePrice || 0;
            const vatRate = oldVariant?.vatRate || oldProduct.vatRate || 21;
            const stock = oldVariant?.stock || 0;

            await CreatorListingModel.create({
              creatorId,
              productId: product._id,
              variantId: variant._id,
              sku: oldVariant?.sku || `${oldProduct.sku || product._id}-${variant.size}-${variant.color}`,
              priceExclVat,
              priceInclVat: priceExclVat * (1 + vatRate / 100),
              vatRate,
              stock,
              costPrice: oldVariant?.costPrice,
              supplier: oldVariant?.supplier,
              active: oldVariant?.active !== false && oldProduct.active !== false
            });
          }

          // Update product to remove old fields
          await ProductModel.updateOne(
            { _id: product._id },
            {
              $unset: {
                basePrice: 1,
                vatRate: 1,
                inventory: 1,
                host: 1
              }
            }
          );

          migrated++;
          console.log(`✅ Migrated product with variants: ${product.title || product._id}`);
        }
      } catch (error) {
        console.error(`❌ Error migrating product ${product._id}:`, error);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated: ${migrated} products`);
    console.log(`   - Skipped: ${skipped} products`);
    console.log(`   - Errors: ${errors} products`);

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
void migrateInventoryToCreatorListings();

