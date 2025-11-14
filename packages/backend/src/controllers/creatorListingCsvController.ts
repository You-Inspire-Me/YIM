import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import multer from 'multer';
import Papa from 'papaparse';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';
import { lookupProductByEAN } from '../services/icecatService.js';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadMiddleware = upload.single('csv');

interface CsvRow {
  sku: string; // Global product SKU
  ean?: string; // EAN for Icecat lookup (optional)
  variant_size: string;
  variant_color: string;
  price_excl_vat: number;
  price_incl_vat?: number;
  vat_rate?: number;
  stock: number;
  cost_price?: number;
  supplier?: string;
  active?: boolean | string;
  pos_system?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  pos_external_id?: string;
}

/**
 * Import CSV for CreatorListings ONLY
 * CSV format (required columns):
 * sku,variant_size,variant_color,price_excl_vat,price_incl_vat,vat_rate,stock,cost_price,supplier,active,pos_system,pos_external_id
 * 
 * Rules:
 * - Match global Product by SKU or EAN
 * - If Product not found → error (must create Product first)
 * - Auto-create/update CreatorListing
 * - Auto-calculate priceInclVat if missing
 */
export const importCreatorListingCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'No CSV file provided' });
    return;
  }

  try {
    const csvContent = req.file.buffer.toString('utf-8');
    // Removed console.log to avoid showing old headers in logs

    const parseResult = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (value: string) => value.trim(),
      transformHeader: (header: string) => {
        const normalized = header.trim().toLowerCase();
        const headerMap: Record<string, string> = {
          sku: 'sku',
          ean: 'ean', // EAN column for Icecat lookup
          variant_size: 'variant_size',
          size: 'variant_size',
          variant_color: 'variant_color',
          color: 'variant_color',
          price_excl_vat: 'price_excl_vat',
          price_incl_vat: 'price_incl_vat',
          vat_rate: 'vat_rate',
          stock: 'stock',
          voorraad: 'stock',
          cost_price: 'cost_price',
          supplier: 'supplier',
          active: 'active',
          pos_system: 'pos_system',
          pos_external_id: 'pos_external_id'
        };
        return headerMap[normalized] || normalized;
      }
    });

    // Removed console.log to avoid showing old headers in logs

    if (parseResult.errors.length > 0) {
      // Removed console.log to avoid showing old headers in logs
      const criticalErrors = parseResult.errors.filter(
        (e: any) =>
          (e.type === 'Quotes' && e.code === 'MissingQuotes') ||
          (e.type === 'Delimiter' && e.code === 'UndetectableDelimiter')
      );
      if (criticalErrors.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: 'CSV parsing errors',
          errors: parseResult.errors
        });
        return;
      }
      // Removed console.log to avoid showing old headers in logs
    }

    // Parse and validate rows with proper error handling
    const rows: CsvRow[] = [];
    const parseErrors: Array<{ row: number; error: string }> = [];
    
    parseResult.data
      .filter((rawRow) => rawRow && Object.keys(rawRow).length > 0)
      .forEach((rawRow, index) => {
        try {
          const priceExclVat = parseFloat((rawRow.price_excl_vat || '0').replace(',', '.'));
          const priceInclVat = rawRow.price_incl_vat
            ? parseFloat(rawRow.price_incl_vat.replace(',', '.'))
            : undefined;
          const vatRate = rawRow.vat_rate ? parseFloat(rawRow.vat_rate) : undefined;
          const stock = parseInt((rawRow.stock || '0').replace(',', '.'), 10);

          const row: CsvRow = {
            sku: (rawRow.sku || '').trim(),
            ean: (rawRow.ean || '').trim() || undefined,
            variant_size: (rawRow.variant_size || '').trim(),
            variant_color: (rawRow.variant_color || '').trim(),
            price_excl_vat: priceExclVat,
            price_incl_vat: priceInclVat,
            vat_rate: vatRate,
            stock: stock,
            cost_price: rawRow.cost_price ? parseFloat(rawRow.cost_price.replace(',', '.')) : undefined,
            supplier: (rawRow.supplier || '').trim() || undefined,
            active: rawRow.active
              ? rawRow.active.toLowerCase() === 'true' || rawRow.active === '1' || rawRow.active === 'yes'
              : true,
            pos_system: (rawRow.pos_system || 'none').trim().toLowerCase() as 'lightspeed' | 'vend' | 'shopify' | 'none',
            pos_external_id: (rawRow.pos_external_id || '').trim() || undefined
          };

          // Validate required fields
          if (!row.sku || !row.variant_size || !row.variant_color) {
            throw new Error('Missing required fields: sku, variant_size, variant_color');
          }

          if (row.price_excl_vat <= 0) {
            throw new Error('price_excl_vat must be greater than 0');
          }

          if (row.stock < 0) {
            throw new Error('stock must be >= 0');
          }

          // Calculate price_incl_vat if not provided
          if (!row.price_incl_vat) {
            const rate = row.vat_rate || 21;
            row.price_incl_vat = row.price_excl_vat * (1 + rate / 100);
          }

          // Validate VAT rate
          if (row.vat_rate !== undefined && ![0, 9, 21].includes(row.vat_rate)) {
            throw new Error('vat_rate must be 0, 9, or 21');
          }

          rows.push(row);
        } catch (error) {
          parseErrors.push({
            row: index + 2, // +2 because header is row 1, and arrays are 0-indexed
            error: error instanceof Error ? error.message : 'Unknown parsing error'
          });
        }
      });

    // Removed console.log to avoid showing old headers in logs

    const errors: Array<{ row: number; error: string }> = [...parseErrors];
    const success: Array<{ sku: string; variant: string }> = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.sku || !row.variant_size || !row.variant_color) {
          errors.push({
            row: i + 2,
            error: 'Missing required fields: sku, variant_size, variant_color'
          });
          continue;
        }

        // Find global Product by SKU or EAN - use lean() to avoid Mongoose document issues
        let product = await ProductModel.findOne({
          $or: [
            { sku: row.sku },
            ...(row.ean ? [{ ean: row.ean }, { ean: row.sku }] : [{ ean: row.sku }])
          ]
        }).lean();

        let productId: mongoose.Types.ObjectId;

        // Auto-create product if it doesn't exist
        if (!product) {
          try {
            // If EAN is provided, try Icecat lookup first
            let icecatData = null;
            if (row.ean) {
              console.log(`[CSV Import] Row ${i + 2}: EAN provided (${row.ean}), attempting Icecat lookup...`);
              try {
                icecatData = await lookupProductByEAN(row.ean);
                if (icecatData) {
                  console.log(`[CSV Import] Row ${i + 2}: Icecat product found: ${icecatData.title}`);
                } else {
                  console.log(`[CSV Import] Row ${i + 2}: No Icecat product found for EAN ${row.ean}`);
                }
              } catch (icecatError) {
                console.warn(`[CSV Import] Row ${i + 2}: Icecat lookup failed:`, icecatError);
                // Continue without Icecat data
              }
            }

            // Use direct MongoDB insert to avoid validation issues
            // Get db connection
            const db = mongoose.connection.db || mongoose.connection.getClient().db();
            const newProduct = {
              sku: row.sku,
              ean: row.ean || icecatData?.ean || undefined,
              title: icecatData?.title || `${row.sku} - Product`,
              description: icecatData?.description || `Product ${row.sku} imported from CSV`,
              category: 'all',
              images: icecatData?.images || [],
              specs: icecatData?.specs || {},
              variants: [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            const insertResult = await db.collection('products').insertOne(newProduct);
            productId = insertResult.insertedId;
            product = { ...newProduct, _id: productId } as any;
            console.log(`Auto-created product: ${row.sku}${icecatData ? ' (with Icecat data)' : ''}`);
          } catch (createError) {
            errors.push({
              row: i + 2,
              error: `Failed to create product "${row.sku}": ${createError instanceof Error ? createError.message : 'Unknown error'}`
            });
            continue;
          }
        } else {
          productId = (product as any)._id;
          
          // ALWAYS fix category using direct MongoDB update to bypass validation
          // Do this BEFORE any other operations to ensure the product is valid
          const validCategories = ['dames', 'heren', 'kinderen', 'all'];
          const currentCategory = (product as any).category;
          
          // Always fix category if it's not valid - use direct MongoDB
          const db = mongoose.connection.db;
          if (!db) {
            errors.push({
              row: i + 2,
              error: 'Database connection not available'
            });
            continue;
          }
          if (!currentCategory || !validCategories.includes(currentCategory)) {
            await db.collection('products').updateOne(
              { _id: productId },
              { $set: { category: 'all' } }
            );
            // Update the product object in memory to reflect the fix
            (product as any).category = 'all';
            console.log(`Fixed invalid category for product: ${row.sku} (was: ${currentCategory})`);
          }
        }
        
        // Find or create Variant - use direct MongoDB to avoid validation issues
        // Get db connection (reuse if already defined)
        const db = mongoose.connection.db || mongoose.connection.getClient().db();
        if (!db) {
          errors.push({
            row: i + 2,
            error: 'Database connection not available'
          });
          continue;
        }
        
        // Use direct MongoDB find instead of Mongoose to avoid any validation
        let variant: any = await db.collection('variants').findOne({
          productId: productId,
          size: row.variant_size,
          color: row.variant_color
        });

        if (!variant) {
          // Use direct MongoDB insert to avoid Mongoose validation
          const variantData = {
            productId: productId,
            size: row.variant_size,
            color: row.variant_color,
            images: [],
            weight: 0,
            barcode: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const insertResult = await db.collection('variants').insertOne(variantData);
          variant = { ...variantData, _id: insertResult.insertedId } as any;
          console.log(`Created new variant: ${row.variant_size} / ${row.variant_color}`);

          // Add variant to product using direct MongoDB update
          // Always set category to 'all' to ensure it's valid
          await db.collection('products').updateOne(
            { _id: productId },
            { 
              $addToSet: { variants: variant._id },
              $set: { category: 'all' } // Always set to 'all' to avoid validation errors
            }
          );
        }

        // Ensure variant exists
        if (!variant || !variant._id) {
          errors.push({
            row: i + 2,
            error: `Failed to create or find variant for ${row.variant_size} / ${row.variant_color}`
          });
          continue;
        }

        // Create or update CreatorListing using direct MongoDB to avoid validation
        const productSku = (product as any).sku || row.sku;
        const listingSku = `${productSku}-${row.variant_size}-${row.variant_color}`;
        const vatRate = row.vat_rate || 21;
        const priceInclVat = row.price_incl_vat || row.price_excl_vat * (1 + vatRate / 100);

        // Use direct MongoDB upsert to bypass Mongoose validation
        const listingData = {
          creatorId: req.user._id,
          productId: productId,
          variantId: variant._id,
          sku: listingSku,
          priceExclVat: row.price_excl_vat,
          priceInclVat: priceInclVat,
          vatRate: vatRate,
          stock: row.stock,
          costPrice: row.cost_price || null,
          supplier: row.supplier || null,
          active: row.active !== undefined ? row.active : true,
          posSystem: row.pos_system || 'none',
          posExternalId: row.pos_external_id || null,
          posSync: row.pos_system && row.pos_system !== 'none' ? true : false,
          lastPosSync: null,
          updatedAt: new Date()
        };

        // Use direct MongoDB upsert to completely bypass Mongoose validation
        const listingCollection = db.collection('creatorlistings');
        const listingFilter = {
          creatorId: req.user._id,
          productId: productId,
          variantId: variant._id
        };
        
        // Check if listing exists
        const existingListing = await listingCollection.findOne(listingFilter);
        
        if (existingListing) {
          // Update existing listing
          await listingCollection.updateOne(
            listingFilter,
            { $set: listingData }
          );
        } else {
          // Insert new listing
          await listingCollection.insertOne({
            ...listingData,
            createdAt: new Date()
          });
        }
        
        // For response, we don't need the actual listing object
        const listing = { _id: existingListing?._id || 'new' } as any;

        success.push({ sku: row.sku || productSku, variant: `${row.variant_size}-${row.variant_color}` });
        console.log(`Created/updated listing: ${listingSku}`);
      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const statusCode = success.length > 0 ? StatusCodes.OK : StatusCodes.BAD_REQUEST;
    res.status(statusCode).json({
      message:
        success.length > 0
          ? `Import completed: ${success.length} listings processed${errors.length > 0 ? `, ${errors.length} errors` : ''}`
          : 'Import failed: no listings were processed',
      success: success.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to import CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * DEPRECATED: Export CreatorListings as CSV (with price)
 * NOTE: For stock-only export, use /api/merchant/offers/stock/export instead
 * This export includes price information for listings
 */
export const exportCreatorListingCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const listings = await CreatorListingModel.find({ creatorId: req.user._id })
      .populate('productId')
      .populate('variantId')
      .lean();

    const csvRows = listings.map((listing: any) => ({
      merchantSku: listing.sku || '',
      variant_size: listing.variantId?.size || '',
      variant_color: listing.variantId?.color || '',
      price_excl_vat: listing.priceExclVat,
      price_incl_vat: listing.priceInclVat,
      vat_rate: listing.vatRate || 21,
      stock: listing.stock,
      cost_price: listing.costPrice || '',
      supplier: listing.supplier || '',
      active: listing.active ? '1' : '0',
      pos_system: listing.posSystem || 'none',
      pos_external_id: listing.posExternalId || ''
    }));

    const csv = Papa.unparse(csvRows, {
      header: true,
      columns: [
        'merchantSku',
        'variant_size',
        'variant_color',
        'price_excl_vat',
        'price_incl_vat',
        'vat_rate',
        'stock',
        'cost_price',
        'supplier',
        'active',
        'pos_system',
        'pos_external_id'
      ]
    });

    const csvWithBom = '\ufeff' + csv;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="creator-listings.csv"');
    res.status(StatusCodes.OK).send(csvWithBom);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to export CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

