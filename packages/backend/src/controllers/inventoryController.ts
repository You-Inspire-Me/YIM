import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { MerchantModel } from '../models/Merchant.js';
import { MerchantOfferModel } from '../models/MerchantOffer.js';
import { MerchantStockModel } from '../models/MerchantStock.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadMiddleware = upload.single('csv');

interface CsvRow {
  sku: string;
  variant_size?: string;
  variant_color?: string;
  stock: number;
  price_excl_vat?: number;
  price_incl_vat?: number;
  vat_rate?: number;
  barcode?: string;
  ean?: string;
  cost_price?: number;
  supplier?: string;
  brand?: string;
  title?: string;
  category?: string;
  weight_grams?: number;
  active?: boolean | string;
}

const csvRowSchema = z.object({
  sku: z.string().min(1),
  variant_size: z.string().optional(),
  variant_color: z.string().optional(),
  stock: z.number().int().min(0),
  price_excl_vat: z.number().min(0).optional(),
  price_incl_vat: z.number().min(0).optional(),
  vat_rate: z.number().refine((val) => [0, 9, 21].includes(val), {
    message: 'VAT rate must be 0, 9, or 21'
  }).optional(),
  barcode: z.string().optional(),
  ean: z.string().optional(),
  cost_price: z.number().min(0).optional(),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  weight_grams: z.number().min(0).optional(),
  active: z.union([z.boolean(), z.string()]).optional()
});

export const getHostInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const { search, category, sortBy, sortOrder } = req.query;
  // Use CreatorListings instead of old Product model
  const filters: Record<string, unknown> = { creatorId: req.user._id };

  if (search && typeof search === 'string') {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { 'variants.sku': { $regex: search, $options: 'i' } },
      { 'variants.barcode': { $regex: search, $options: 'i' } },
      { 'variants.ean': { $regex: search, $options: 'i' } }
    ];
  }

  if (category && typeof category === 'string' && category !== 'all') {
    filters.category = category;
  }

  const products = await ProductModel.find(filters)
    .select('title images category inventory sizes colors variants tags sku brand weightGrams active')
    .sort({ title: 1 })
    .lean();

  // Transform to inventory format with variants
  // NOTE: This is legacy code - should use CreatorListings instead
  const inventory = products.flatMap((product: any) => {
    // If product has variants (populated), use them
    if (product.variants && product.variants.length > 0 && typeof product.variants[0] === 'object') {
      return product.variants.map((variant: any) => ({
        _id: product._id,
        variantId: `${product._id}-${variant._id || variant.sku || ''}`,
        title: product.title,
        image: product.images?.[0] || '',
        category: product.category,
        brand: (product as any).brand || '',
        sku: variant.sku || product.sku || '',
        size: variant.size || '',
        color: variant.color || variant.colorCode || '',
        stock: (variant as any).stock || 0,
        priceExclVat: (variant as any).priceExclVat,
        priceInclVat: (variant as any).priceInclVat,
        vatRate: (variant as any).vatRate || 21,
        barcode: variant.barcode || '',
        ean: variant.ean || '',
        costPrice: (variant as any).costPrice,
        supplier: (variant as any).supplier || '',
        weightGrams: (product as any).weightGrams,
        active: (variant as any).active !== undefined ? (variant as any).active : ((product as any).active !== undefined ? (product as any).active : true)
      }));
    }

    // Legacy: create variants from sizes array
    if ((product as any).sizes && (product as any).sizes.length > 0) {
      return (product as any).sizes.map((size: string) => ({
        _id: product._id,
        variantId: `${product._id}-${product.sku || product._id}-${size}`,
        title: product.title,
        image: product.images?.[0] || '',
        category: product.category,
        brand: (product as any).brand || '',
        sku: `${product.sku || product._id}-${size}`,
        size,
        color: '',
        stock: (product as any).inventory || 0,
        priceExclVat: undefined,
        priceInclVat: undefined,
        vatRate: 21,
        barcode: '',
        ean: '',
        costPrice: undefined,
        supplier: '',
        weightGrams: (product as any).weightGrams,
        active: (product as any).active !== undefined ? (product as any).active : true
      }));
    }

    // No variants: single product
    return [
      {
        _id: product._id,
        variantId: `${product._id}-${product.sku || product._id}`,
        title: product.title,
        image: product.images?.[0] || '',
        category: product.category,
        brand: (product as any).brand || '',
        sku: product.sku || (product._id as any).toString(),
        size: '',
        color: '',
        stock: (product as any).inventory || 0,
        priceExclVat: undefined,
        priceInclVat: undefined,
        vatRate: 21,
        barcode: '',
        ean: '',
        costPrice: undefined,
        supplier: '',
        weightGrams: (product as any).weightGrams,
        active: (product as any).active !== undefined ? (product as any).active : true
      }
    ];
  });

  // Apply sorting
  if (sortBy && typeof sortBy === 'string') {
    const order = sortOrder === 'desc' ? -1 : 1;
    inventory.sort((a: any, b: any) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * order;
      }
      return String(aVal).localeCompare(String(bVal)) * order;
    });
  }

  res.status(StatusCodes.OK).json({ inventory });
};

/**
 * DEPRECATED: Use /api/merchant/offers/stock/import instead
 * This function now redirects to the new MerchantStock import
 */
export const importInventoryCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'No CSV file provided' });
    return;
  }

  // Redirect to new MerchantStock import
  try {
    const { importStockCsv } = await import('./merchantStockController.js');
    await importStockCsv(req, res);
  } catch (error) {
    console.error('Error redirecting to new import:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to import CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * OLD IMPORT FUNCTION - DEPRECATED
 * This function is kept for reference but should not be used
 * Use importStockCsv from merchantStockController instead
 */
export const _old_importInventoryCsv = async (req: AuthRequest, res: Response): Promise<void> => {
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
      dynamicTyping: false, // Keep everything as strings for manual parsing
      transform: (value: string) => {
        // Preserve string values, trim whitespace
        return value ? value.trim() : '';
      },
      transformHeader: (header: string) => {
        // Normalize header names - keep original if not in map
        const normalized = header.trim().toLowerCase();
        const headerMap: Record<string, string> = {
          'variant_size': 'variant_size',
          'size': 'variant_size',
          'variant_color': 'variant_color',
          'color': 'variant_color',
          'stock': 'stock',
          'voorraad': 'stock',
          'quantity': 'stock',
          'price_excl_vat': 'price_excl_vat',
          'price_incl_vat': 'price_incl_vat',
          'vat_rate': 'vat_rate',
          'barcode': 'barcode',
          'ean': 'ean',
          'cost_price': 'cost_price',
          'supplier': 'supplier',
          'brand': 'brand',
          'title': 'title',
          'category': 'category',
          'weight_grams': 'weight_grams',
          'active': 'active'
        };
        const mapped = headerMap[normalized];
        return mapped || normalized;
      }
    });
    
    console.log('Parsed rows count:', parseResult.data.length);
    if (parseResult.data.length > 0) {
      console.log('First parsed row:', JSON.stringify(parseResult.data[0], null, 2));
    }

    if (parseResult.errors.length > 0) {
      console.log('CSV parsing errors (count):', parseResult.errors.length);
      // Don't fail on minor errors like FieldMismatch (missing fields), Quotes, or Delimiter
      // These are often just warnings about incomplete rows
      const criticalErrors = parseResult.errors.filter((e: any) => 
        e.type === 'Quotes' && e.code === 'MissingQuotes' ||
        e.type === 'Delimiter' && e.code === 'UndetectableDelimiter'
      );
      if (criticalErrors.length > 0) {
        console.error('Critical CSV parsing errors found, aborting');
        res.status(StatusCodes.BAD_REQUEST).json({
          message: 'CSV parsing errors',
          errors: parseResult.errors
        });
        return;
      }
      // Log warnings but continue
      console.log('CSV parsing warnings (continuing anyway):', parseResult.errors.length);
    }

    // Transform raw CSV rows to typed CsvRow objects with proper type conversion
    console.log(`Raw parsed data rows: ${parseResult.data.length}`);
    let rows: CsvRow[] = [];
    try {
      rows = parseResult.data
        .filter((rawRow) => {
          // Skip completely empty rows
          const hasData = rawRow && Object.keys(rawRow).length > 0;
          if (!hasData) {
            console.log('Skipping empty row');
          }
          return hasData;
        })
        .map((rawRow, index) => {
        try {
          const row: CsvRow = {
            sku: (rawRow.sku || '').trim(),
            variant_size: (rawRow.variant_size || '').trim() || undefined,
            variant_color: (rawRow.variant_color || '').trim() || undefined,
            stock: 0,
            price_excl_vat: undefined,
            price_incl_vat: undefined,
            vat_rate: undefined,
            barcode: (rawRow.barcode || '').trim() || undefined,
            ean: (rawRow.ean || '').trim() || undefined,
            cost_price: undefined,
            supplier: (rawRow.supplier || '').trim() || undefined,
            brand: (rawRow.brand || '').trim() || undefined,
            title: (rawRow.title || '').trim() || undefined,
            category: (rawRow.category || '').trim() || undefined,
            weight_grams: undefined,
            active: undefined
          };

          // Parse numeric fields - handle both string and number inputs
          const stockVal = rawRow.stock || rawRow['stock'] || '';
          if (stockVal && stockVal.toString().trim() !== '') {
            const stock = parseFloat(stockVal.toString().replace(',', '.'));
            if (!isNaN(stock)) row.stock = Math.max(0, Math.floor(stock));
          }

          const priceExclVal = rawRow.price_excl_vat || rawRow['price_excl_vat'] || '';
          if (priceExclVal && priceExclVal.toString().trim() !== '') {
            const price = parseFloat(priceExclVal.toString().replace(',', '.'));
            if (!isNaN(price) && price >= 0) row.price_excl_vat = price;
          }

          const priceInclVal = rawRow.price_incl_vat || rawRow['price_incl_vat'] || '';
          if (priceInclVal && priceInclVal.toString().trim() !== '') {
            const price = parseFloat(priceInclVal.toString().replace(',', '.'));
            if (!isNaN(price) && price >= 0) row.price_incl_vat = price;
          }

          const vatRateVal = rawRow.vat_rate || rawRow['vat_rate'] || '';
          if (vatRateVal && vatRateVal.toString().trim() !== '') {
            const rate = parseFloat(vatRateVal.toString());
            if (!isNaN(rate) && [0, 9, 21].includes(rate)) row.vat_rate = rate;
          }

          const costPriceVal = rawRow.cost_price || rawRow['cost_price'] || '';
          if (costPriceVal && costPriceVal.toString().trim() !== '') {
            const cost = parseFloat(costPriceVal.toString().replace(',', '.'));
            if (!isNaN(cost) && cost >= 0) row.cost_price = cost;
          }

          const weightVal = rawRow.weight_grams || rawRow['weight_grams'] || '';
          if (weightVal && weightVal.toString().trim() !== '') {
            const weight = parseFloat(weightVal.toString());
            if (!isNaN(weight) && weight >= 0) row.weight_grams = weight;
          }

          // Parse active field - handle '1', 'true', 'yes', etc.
          const activeVal = rawRow.active || rawRow['active'] || '';
          if (activeVal && activeVal.toString().trim() !== '') {
            const activeStr = activeVal.toString().trim().toLowerCase();
            row.active = activeStr === 'true' || activeStr === '1' || activeStr === 'yes' || activeStr === 'y';
          } else {
            row.active = true; // Default to active if not specified
          }

          return row;
        } catch (error) {
          console.error(`Error parsing row ${index + 2}:`, error, rawRow);
          // Return a row with error flag
          return {
            sku: (rawRow.sku || '').trim(),
            variant_size: undefined,
            variant_color: undefined,
            stock: 0,
            price_excl_vat: undefined,
            price_incl_vat: undefined,
            vat_rate: undefined,
            barcode: undefined,
            ean: undefined,
            cost_price: undefined,
            supplier: undefined,
            brand: undefined,
            title: undefined,
            category: undefined,
            weight_grams: undefined,
            active: undefined
          };
        }
      });
    } catch (transformError) {
      console.error('Error transforming CSV rows:', transformError);
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Error processing CSV data',
        error: transformError instanceof Error ? transformError.message : 'Unknown error'
      });
      return;
    }
    
    console.log(`Transformed rows count: ${rows.length}`);
    const errors: Array<{ row: number; error: string }> = [];
    const success: Array<{ sku: string; stock: number }> = [];

    // Group by unique key: sku + variant_size + variant_color
    const variantMap = new Map<string, CsvRow[]>();
    rows.forEach((row, index) => {
      if (!row.sku || row.sku.trim() === '') {
        console.log(`Row ${index + 2}: Missing SKU, skipping`);
        errors.push({ row: index + 2, error: 'Missing SKU' });
        return;
      }
      const key = `${row.sku}-${row.variant_size || ''}-${row.variant_color || ''}`;
      if (!variantMap.has(key)) {
        variantMap.set(key, []);
      }
      variantMap.get(key)!.push(row);
    });
    
    console.log(`Grouped into ${variantMap.size} unique product groups`);

    // Process each unique variant
    console.log(`Processing ${variantMap.size} unique product groups`);
    for (const [key, variantRows] of variantMap.entries()) {
      try {
        // Use first row for product-level data
        const firstRow = variantRows[0];
        console.log(`Processing product group: ${key}, variants: ${variantRows.length}, title: ${firstRow.title}`);
        
        // Find or create product - try to find by base SKU or any variant SKU
        const baseSku = firstRow.sku?.split('-')[0] || firstRow.sku;
        let product = await ProductModel.findOne({
          host: req.user._id,
          $or: [
            { sku: baseSku },
            { 'variants.sku': firstRow.sku }
          ]
        });

        // If product not found and we have title, create new product
        if (!product && firstRow.title) {
          console.log(`Creating new product: ${firstRow.title} (SKU: ${baseSku})`);
          const basePrice = firstRow.price_incl_vat || firstRow.price_excl_vat || 0;
          const productActive = firstRow.active === true || firstRow.active === undefined;
          try {
            const productDescription = firstRow.title || 'Product imported from CSV';
            product = await ProductModel.create({
              host: req.user._id,
              title: firstRow.title,
              description: productDescription, // Use title as description if no description provided
              price: basePrice,
              brand: firstRow.brand,
              category: firstRow.category || 'clothing',
              images: [],
              inventory: 0,
              variants: [],
              tags: [],
              sku: baseSku,
              weightGrams: firstRow.weight_grams,
              active: productActive
            });
            console.log(`Product created successfully: ${product.title} (ID: ${product._id})`);
          } catch (createError) {
            console.error(`Error creating product ${firstRow.title}:`, createError);
            errors.push({ 
              row: 0, 
              error: `Error creating product ${firstRow.title}: ${createError instanceof Error ? createError.message : 'Unknown error'}` 
            });
            continue;
          }
        }

        if (!product) {
          console.error(`Product not found for SKU: ${firstRow.sku} and no title provided`);
          errors.push({ row: 0, error: `Product not found for SKU: ${firstRow.sku} and no title provided to create new product` });
          continue;
        }

        // Ensure description is set (required field) - check before any modifications
        if (!product.description || product.description.trim() === '') {
          product.description = product.title || firstRow.title || 'Product imported from CSV';
          console.log(`Updated description for existing product: ${product.title}`);
        }

        // Initialize variants array if it doesn't exist
        if (!product.variants) {
          product.variants = [];
        }

        // Process each variant row
        console.log(`Processing ${variantRows.length} variants for product: ${product.title}`);
        for (const row of variantRows) {
          try {
            console.log(`Processing variant: SKU=${row.sku}, Size=${row.variant_size}, Color=${row.variant_color}, Stock=${row.stock}`);
            // Calculate price_incl_vat if not provided but price_excl_vat and vat_rate are
            let priceInclVat = row.price_incl_vat;
            let priceExclVat = row.price_excl_vat;
            let vatRate = row.vat_rate !== undefined ? row.vat_rate : 21;

            if (priceExclVat !== undefined && priceExclVat > 0 && !priceInclVat) {
              priceInclVat = priceExclVat * (1 + vatRate / 100);
            } else if (priceInclVat !== undefined && priceInclVat > 0 && !priceExclVat) {
              priceExclVat = priceInclVat / (1 + vatRate / 100);
            }

            // Validate active field
            let active = true;
            if (row.active !== undefined) {
              if (typeof row.active === 'boolean') {
                active = row.active;
              } else if (typeof row.active === 'string') {
                active = row.active.toLowerCase() === 'true' || row.active === '1' || row.active === 'yes';
              }
            }

            // Find or create variant
            const existingVariantIndex = (product.variants as any[]).findIndex(
              (v: any) => v.sku === row.sku && 
                     (v.size || '') === (row.variant_size || '') && 
                     (v.color || '') === (row.variant_color || '')
            );

            const variantData: any = {
              sku: row.sku.trim(),
              size: row.variant_size?.trim() || undefined,
              color: row.variant_color?.trim() || undefined,
              stock: Math.max(0, Math.floor(row.stock || 0)),
              priceExclVat: priceExclVat && priceExclVat > 0 ? Number(priceExclVat.toFixed(2)) : undefined,
              priceInclVat: priceInclVat && priceInclVat > 0 ? Number(priceInclVat.toFixed(2)) : undefined,
              vatRate: vatRate as 0 | 9 | 21,
              barcode: row.barcode?.trim() || undefined,
              ean: row.ean?.trim() || undefined,
              costPrice: row.cost_price && row.cost_price > 0 ? Number(row.cost_price.toFixed(2)) : undefined,
              supplier: row.supplier?.trim() || undefined,
              active
            };
            
            // Validate required fields
            if (!variantData.sku || variantData.sku.trim() === '') {
              throw new Error('SKU is required');
            }

            if (existingVariantIndex >= 0) {
              // Update existing variant
              Object.assign(product.variants[existingVariantIndex], variantData);
            } else {
              // Create new variant
              (product.variants as any[]).push(variantData);
            }

            // Update product-level fields if provided
            if (firstRow.brand) (product as any).brand = firstRow.brand;
            if (firstRow.title) {
              product.title = firstRow.title;
              // Ensure description is updated if title changes
              if (!product.description || product.description.trim() === '') {
                product.description = firstRow.title;
              }
            }
            if (firstRow.category && ['dames', 'heren', 'kinderen', 'all'].includes(firstRow.category)) {
              product.category = firstRow.category as 'dames' | 'heren' | 'kinderen' | 'all';
            }
            if (firstRow.weight_grams) (product as any).weightGrams = firstRow.weight_grams;
            if (firstRow.active !== undefined) {
              (product as any).active = typeof firstRow.active === 'boolean' 
                ? firstRow.active 
                : (firstRow.active === 'true' || firstRow.active === '1' || firstRow.active === 'yes');
            }
            
            // Ensure description is always set after any updates
            if (!product.description || product.description.trim() === '') {
              product.description = product.title || firstRow.title || 'Product imported from CSV';
            }

            success.push({ sku: row.sku, stock: variantData.stock || 0 });
            console.log(`Variant processed successfully: ${row.sku}`);
          } catch (error) {
            console.error(`Error processing variant for SKU ${row.sku}:`, error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('Variant error stack:', errorStack);
            
            if (error instanceof z.ZodError) {
              errors.push({
                row: 0,
                error: `Invalid data for SKU ${row.sku || 'unknown'}: ${error.errors.map((e) => e.message).join(', ')}`
              });
            } else {
              let errorMessage = error instanceof Error ? error.message : 'Unknown error';
              
              // Check for Mongoose validation errors
              if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'ValidationError') {
                const validationError = error as any;
                if (validationError.errors) {
                  const fieldErrors = Object.keys(validationError.errors).map((field) => {
                    return `${field}: ${validationError.errors[field].message}`;
                  }).join(', ');
                  errorMessage = `Validation error: ${fieldErrors}`;
                }
              }
              
              errors.push({
                row: 0,
                error: `Error processing SKU ${row.sku || 'unknown'}: ${errorMessage}`
              });
            }
          }
        }

        // Update total inventory (sum of all variants)
        (product as any).inventory = (product.variants as any[]).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        
        // Update main price from first variant if available
        if ((product.variants as any[]).length > 0 && (product.variants[0] as any).priceInclVat) {
          (product as any).price = (product.variants[0] as any).priceInclVat;
        }

        // Final check: ensure description is set before saving (required field)
        if (!product.description || product.description.trim() === '') {
          product.description = product.title || firstRow.title || 'Product imported from CSV';
          console.log(`Final check: Set description for product: ${product.title}`);
        }

        // Validate required fields before save
        if (!product.title || product.title.trim() === '') {
          throw new Error('Product title is required');
        }
        if (!product.description || product.description.trim() === '') {
          throw new Error('Product description is required');
        }
        if (!product.category || product.category.trim() === '') {
          product.category = 'all'; // Default category
        }

        try {
          await product.save();
          console.log(`Product saved successfully: ${product.title} (${product.variants.length} variants)`);
        } catch (saveError) {
          console.error(`Error saving product ${product.title}:`, saveError);
          console.error('Product data before save:', {
            title: product.title,
            description: product.description,
            category: product.category,
            variantsCount: product.variants.length
          });
          throw saveError;
        }
      } catch (error) {
        console.error(`Error processing variant group ${key}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Error stack:', errorStack);
        
        // Try to get more details from the error
        let detailedError = errorMessage;
        if (error && typeof error === 'object' && 'errors' in error) {
          const validationErrors = (error as any).errors;
          const errorDetails = Object.keys(validationErrors).map((field) => {
            return `${field}: ${validationErrors[field].message || validationErrors[field]}`;
          }).join(', ');
          detailedError = `${errorMessage} - ${errorDetails}`;
        }
        
        errors.push({
          row: 0,
          error: `Error processing variant group ${key}: ${detailedError}`
        });
      }
    }

    // Return success even if there are some errors, as long as at least one item was imported
    const statusCode = success.length > 0 ? StatusCodes.OK : StatusCodes.BAD_REQUEST;
    res.status(statusCode).json({
      message: success.length > 0 
        ? `Inventory imported: ${success.length} items successful${errors.length > 0 ? `, ${errors.length} errors` : ''}`
        : 'Import failed: no items were imported',
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

export const updateVariantStock = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { variantId } = req.params;
    const { stock, priceExclVat, priceInclVat, vatRate, active } = req.body;

    // Parse variantId: format is "productId-sku"
    const [productId, ...skuParts] = variantId.split('-');
    const sku = skuParts.join('-');

    const product = await ProductModel.findOne({
      _id: productId,
      host: req.user._id
    });

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    if (!product.variants) {
      product.variants = [];
    }

    const variantIndex = (product.variants as any[]).findIndex((v: any) => v.sku === sku);
    if (variantIndex >= 0) {
      if (stock !== undefined) (product.variants[variantIndex] as any).stock = stock;
      if (priceExclVat !== undefined) (product.variants[variantIndex] as any).priceExclVat = priceExclVat;
      if (priceInclVat !== undefined) (product.variants[variantIndex] as any).priceInclVat = priceInclVat;
      if (vatRate !== undefined) (product.variants[variantIndex] as any).vatRate = vatRate as 0 | 9 | 21;
      if (active !== undefined) (product.variants[variantIndex] as any).active = active;
    } else {
      // Create new variant
      (product.variants as any[]).push({
        sku,
        stock: stock || 0,
        priceExclVat,
        priceInclVat,
        vatRate: (vatRate || 21) as 0 | 9 | 21,
        active: active !== undefined ? active : true
      });
    }

    // Update total inventory
    (product as any).inventory = (product.variants as any[]).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    await product.save();

    res.status(StatusCodes.OK).json({
      message: 'Variant updated',
      variant: (product.variants as any[])[variantIndex >= 0 ? variantIndex : (product.variants as any[]).length - 1]
    });
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update variant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const bulkUpdateVariants = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { variantIds, updates } = req.body;

    if (!Array.isArray(variantIds) || !updates) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });
      return;
    }

    const results = { updated: 0, errors: 0 };

    for (const variantId of variantIds) {
      try {
        const [productId, ...skuParts] = variantId.split('-');
        const sku = skuParts.join('-');

        const product = await ProductModel.findOne({
          _id: productId,
          host: req.user._id
        });

        if (!product || !product.variants) continue;

        const variantIndex = (product.variants as any[]).findIndex((v: any) => v.sku === sku);
        if (variantIndex >= 0) {
          if (updates.priceExclVat !== undefined) {
            (product.variants[variantIndex] as any).priceExclVat = updates.priceExclVat;
          }
          if (updates.priceInclVat !== undefined) {
            (product.variants[variantIndex] as any).priceInclVat = updates.priceInclVat;
          }
          if (updates.active !== undefined) {
            (product.variants[variantIndex] as any).active = updates.active;
          }
          await product.save();
          results.updated++;
        }
      } catch {
        results.errors++;
      }
    }

    res.status(StatusCodes.OK).json({
      message: 'Bulk update completed',
      ...results
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to bulk update',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * DEPRECATED: Use /api/merchant/offers/stock/export instead
 * This function now directly calls the new MerchantStock export logic
 */
export const exportInventoryCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  // Directly use the new MerchantStock export logic
  try {

    const merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Merchant not found' });
      return;
    }

    const offers = await MerchantOfferModel.find({ merchantId: merchant._id })
      .populate({
        path: 'variantId',
        select: 'size colorCode sku'
      })
      .populate('merchantId', 'name')
      .lean();

    const csvRows: any[] = [];

    for (const offer of offers) {
      const stocks = await MerchantStockModel.find({ offerId: offer._id })
        .populate('locationId')
        .lean();

      if (stocks.length === 0) {
        csvRows.push({
          merchantSku: offer.merchantSku,
          variant_size: (offer.variantId as any).size || '',
          variant_color: (offer.variantId as any).colorCode || '',
          stock: 0,
          location_type: 'warehouse',
          pos_system: 'none',
          pos_external_id: ''
        });
      } else {
        for (const stock of stocks) {
          csvRows.push({
            merchantSku: offer.merchantSku,
            variant_size: (offer.variantId as any).size || '',
            variant_color: (offer.variantId as any).colorCode || '',
            stock: stock.availableQty || 0,
            location_type: (stock.locationId as any).type || 'warehouse',
            pos_system: stock.posSystem || 'none',
            pos_external_id: stock.posExternalId || ''
          });
        }
      }
    }

    const csv = Papa.unparse(csvRows, {
      header: true,
      columns: [
        'merchantSku',
        'variant_size',
        'variant_color',
        'stock',
        'location_type',
        'pos_system',
        'pos_external_id'
      ]
    });

    const csvWithBom = '\ufeff' + csv;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="merchant-stock.csv"');
    res.status(StatusCodes.OK).send(csvWithBom);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to export CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
