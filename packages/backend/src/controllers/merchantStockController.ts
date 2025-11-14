import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import Papa from 'papaparse';
import mongoose from 'mongoose';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { MerchantStockModel } from '../models/MerchantStock.js';
import { MerchantOfferModel } from '../models/MerchantOffer.js';
import { MerchantModel } from '../models/Merchant.js';
import { ProductVariantModel } from '../models/ProductVariant.js';
import { LocationModel } from '../models/Location.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept CSV files only
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('csv');

interface CsvRow {
  merchantSku: string;
  variant_size: string;
  variant_color: string;
  stock: number;
  location_type?: 'store' | 'warehouse' | '3pl';
  pos_system?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  pos_external_id?: string;
}

const MAX_ROWS = 10000; // Prevent performance issues with huge files

/**
 * Validate CSV file before processing
 */
function validateCsvFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum size is 10MB' };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check if file is too small (likely corrupt)
  if (file.size < 10) {
    return { valid: false, error: 'File appears to be corrupt (too small)' };
  }

  return { valid: true };
}

/**
 * Try to detect file encoding
 */
function detectEncoding(buffer: Buffer): string {
  // Check for BOM (Byte Order Mark)
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf-8';
  }
  // Default to utf-8, but try to handle common encodings
  return 'utf-8';
}

/**
 * CSV Import - STOCK ONLY
 * Headers: merchantSku,variant_size,variant_color,stock,location_type,pos_system,pos_external_id
 * NO PRICE IN CSV - Price set in UI only
 */
export const importStockCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[CSV Import] Request received');
  
  try {
    if (!req.user) {
      console.error('[CSV Import] Not authenticated');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
      return;
    }

    console.log('[CSV Import] User authenticated:', req.user._id, req.user.role);

    if (!req.file) {
      console.error('[CSV Import] No file provided');
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'No CSV file provided' });
      return;
    }

    console.log('[CSV Import] File received:', req.file.originalname, req.file.size, 'bytes');

    // Validate file
    const fileValidation = validateCsvFile(req.file);
    if (!fileValidation.valid) {
      console.error('[CSV Import] File validation failed:', fileValidation.error);
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: fileValidation.error || 'Invalid file',
        details: {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
      return;
    }

    // Find or create merchant
    let merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      // Auto-create merchant for creator users
      console.log('[CSV Import] Creating merchant for user:', req.user._id);
      const userName = (req.user as any).profile?.name || (req.user as any).email?.split('@')[0] || 'Merchant';
      const userEmail = (req.user as any).email || 'merchant@example.com';
      merchant = await MerchantModel.create({
        merchantId: req.user._id,
        name: userName,
        legalEntity: userName,
        country: (req.user as any).profile?.address?.country || 'NL',
        active: true
      });
      console.log('[CSV Import] Merchant created:', merchant._id);
    }

    // Detect encoding and convert to string
    console.log('[CSV Import] Detecting encoding...');
    let csvContent: string;
    try {
      const encoding = detectEncoding(req.file.buffer) as BufferEncoding;
      csvContent = req.file.buffer.toString(encoding);
      console.log('[CSV Import] Encoding detected:', encoding, 'Content length:', csvContent.length);
    } catch (encodingError) {
      console.error('[CSV Import] Encoding error:', encodingError);
      // Fallback to utf-8
      csvContent = req.file.buffer.toString('utf-8');
      console.log('[CSV Import] Using UTF-8 fallback, content length:', csvContent.length);
    }

    // Validate CSV content is not empty
    console.log('[CSV Import] Validating CSV content...');
    if (!csvContent || csvContent.trim().length === 0) {
      console.error('[CSV Import] CSV content is empty');
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'CSV file appears to be empty or corrupt' 
      });
      return;
    }

    // Parse CSV with error handling
    console.log('[CSV Import] Parsing CSV...');
    let parseResult: Papa.ParseResult<Record<string, string>>;
    try {
      parseResult = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transform: (value: string) => {
          if (typeof value !== 'string') return '';
          return value.trim();
        },
        transformHeader: (header: string) => {
          if (typeof header !== 'string') return '';
          const normalized = header.trim().toLowerCase();
          const headerMap: Record<string, string> = {
            merchant_sku: 'merchantSku',
            merchantsku: 'merchantSku',
            merchantSku: 'merchantSku',
            sku: 'merchantSku', // Legacy: map sku to merchantSku
            creator_sku: 'merchantSku', // Legacy: map creator_sku to merchantSku
            variant_size: 'variant_size',
            'variant size': 'variant_size',
            size: 'variant_size',
            variant_color: 'variant_color',
            'variant color': 'variant_color',
            color: 'variant_color',
            stock: 'stock',
            voorraad: 'stock',
            quantity: 'stock',
            location_type: 'location_type',
            'location type': 'location_type',
            location: 'location_type',
            pos_system: 'pos_system',
            'pos system': 'pos_system',
            pos_external_id: 'pos_external_id',
            'pos external id': 'pos_external_id',
            // Ignore old price/product fields (not used in stock-only import)
            price_excl_vat: '__ignore__',
            'price excl vat': '__ignore__',
            price_incl_vat: '__ignore__',
            'price incl vat': '__ignore__',
            vat_rate: '__ignore__',
            'vat rate': '__ignore__',
            cost_price: '__ignore__',
            'cost price': '__ignore__',
            supplier: '__ignore__',
            active: '__ignore__',
            ean: '__ignore__',
            title: '__ignore__',
            description: '__ignore__',
            category: '__ignore__',
            weight_grams: '__ignore__',
            'weight grams': '__ignore__',
            weight: '__ignore__',
            barcode: '__ignore__'
          };
          const mapped = headerMap[normalized];
          // If not in map and contains ignored keywords, ignore it
          if (!mapped) {
            const ignoredKeywords = ['price', 'vat', 'cost', 'supplier', 'active', 'ean', 'title', 'description', 'category', 'weight', 'barcode'];
            if (ignoredKeywords.some(keyword => normalized.includes(keyword))) {
              return '__ignore__';
            }
          }
          return mapped || normalized;
        }
      });
    } catch (parseError) {
      console.error('CSV parse error:', parseError);
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Failed to parse CSV file. Please check the file format.',
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
      return;
    }

    // Check for critical parsing errors
    if (parseResult.errors && parseResult.errors.length > 0) {
      const criticalErrors = parseResult.errors.filter(
        (e: any) =>
          (e.type === 'Quotes' && e.code === 'MissingQuotes') ||
          (e.type === 'Delimiter' && e.code === 'UndetectableDelimiter') ||
          (e.type === 'FieldMismatch' && e.message?.includes('Too many fields'))
      );
      if (criticalErrors.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: 'CSV file has critical parsing errors. Please check the file format.',
          errors: criticalErrors.slice(0, 10) // Limit error output
        });
        return;
      }
    }

    // Check if we have any data
    if (!parseResult.data || parseResult.data.length === 0) {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'CSV file contains no data rows' 
      });
      return;
    }

    // Check row limit
    if (parseResult.data.length > MAX_ROWS) {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: `CSV file contains too many rows (${parseResult.data.length}). Maximum is ${MAX_ROWS} rows.` 
      });
      return;
    }

    // Filter out ignored columns from parsed data
    const filteredData = parseResult.data
      .filter((row: any) => row && typeof row === 'object')
      .map((row: any) => {
        const filtered: any = {};
        Object.keys(row).forEach(key => {
          if (key && !key.startsWith('__ignore__')) {
            filtered[key] = row[key];
          }
        });
        return filtered;
      })
      .filter((row: any) => Object.keys(row).length > 0);

    // Validate and transform rows (with individual error handling)
    const rows: CsvRow[] = [];
    const parseErrors: Array<{ row: number; error: string }> = [];
    const seenRows = new Set<string>(); // For duplicate detection

    for (let i = 0; i < filteredData.length; i++) {
      const rawRow = filteredData[i];
      const rowNumber = i + 2; // +2 because header is row 1, and arrays are 0-indexed

      try {
        // Check if row is empty
        if (!rawRow || Object.keys(rawRow).length === 0) {
          continue; // Skip empty rows
        }

        // Get merchantSku from various possible column names - check all possible variations
        const merchantSku = (
          rawRow.merchantSku || 
          rawRow.merchant_sku || 
          rawRow.merchantsku ||
          rawRow['merchantSku'] ||
          rawRow['merchant_sku'] ||
          rawRow['merchantsku'] ||
          rawRow.sku || 
          rawRow['sku'] ||
          rawRow.creator_sku || 
          rawRow['creator_sku'] ||
          rawRow['creator sku'] ||
          ''
        ).toString().trim();

        const variant_size = (rawRow.variant_size || rawRow.size || '').toString().trim();
        const variant_color = (rawRow.variant_color || rawRow.color || '').toString().trim();
        
        // Parse stock with better error handling
        let stock: number;
        try {
          const stockStr = (rawRow.stock || rawRow.voorraad || '0').toString().replace(',', '.');
          stock = parseInt(stockStr, 10);
          if (isNaN(stock)) {
            throw new Error(`Invalid stock value: "${rawRow.stock}"`);
          }
        } catch (stockError) {
          parseErrors.push({
            row: rowNumber,
            error: `Invalid stock value: "${rawRow.stock}" (must be a number)`
          });
          continue;
        }

        // Validate required fields
        if (!merchantSku || merchantSku.length === 0) {
          parseErrors.push({
            row: rowNumber,
            error: 'Missing required field: merchantSku (or sku/creator_sku)'
          });
          continue;
        }

        if (!variant_size || variant_size.length === 0) {
          parseErrors.push({
            row: rowNumber,
            error: 'Missing required field: variant_size (or size)'
          });
          continue;
        }

        if (!variant_color || variant_color.length === 0) {
          parseErrors.push({
            row: rowNumber,
            error: 'Missing required field: variant_color (or color)'
          });
          continue;
        }

        if (stock < 0) {
          parseErrors.push({
            row: rowNumber,
            error: `Invalid stock value: ${stock} (must be >= 0)`
          });
          continue;
        }

        // Check for duplicates
        const rowKey = `${merchantSku}|${variant_size}|${variant_color}`;
        if (seenRows.has(rowKey)) {
          parseErrors.push({
            row: rowNumber,
            error: `Duplicate row: merchantSku "${merchantSku}" with variant "${variant_size}/${variant_color}" already exists in this file`
          });
          continue;
        }
        seenRows.add(rowKey);

        // Validate location_type
        const locationType = (rawRow.location_type || rawRow.location || 'warehouse').toString().trim().toLowerCase();
        if (!['store', 'warehouse', '3pl'].includes(locationType)) {
          parseErrors.push({
            row: rowNumber,
            error: `Invalid location_type: "${locationType}" (must be store, warehouse, or 3pl)`
          });
          continue;
        }

        // Validate pos_system
        const posSystem = (rawRow.pos_system || 'none').toString().trim().toLowerCase();
        if (!['lightspeed', 'vend', 'shopify', 'none'].includes(posSystem)) {
          parseErrors.push({
            row: rowNumber,
            error: `Invalid pos_system: "${posSystem}" (must be lightspeed, vend, shopify, or none)`
          });
          continue;
        }

        rows.push({
          merchantSku,
          variant_size,
          variant_color,
          stock,
          location_type: locationType as 'store' | 'warehouse' | '3pl',
          pos_system: posSystem as 'lightspeed' | 'vend' | 'shopify' | 'none',
          pos_external_id: rawRow.pos_external_id ? rawRow.pos_external_id.toString().trim() : undefined
        });
      } catch (rowError) {
        parseErrors.push({
          row: rowNumber,
          error: rowError instanceof Error ? rowError.message : 'Unknown error processing row'
        });
      }
    }

    // If all rows failed validation, return early with helpful message
    if (rows.length === 0 && parseErrors.length > 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: `All rows failed validation. Required columns: merchantSku (or sku/creator_sku), variant_size (or size), variant_color (or color), stock (or voorraad). Old price/product columns are ignored.`,
        errors: parseErrors.slice(0, 50) // Limit to first 50 errors
      });
      return;
    }
    
    // If no rows after filtering, provide helpful message
    if (rows.length === 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'No valid rows found. Required columns: merchantSku (or sku/creator_sku), variant_size (or size), variant_color (or color), stock (or voorraad). Old price/product columns (price_excl_vat, price_incl_vat, vat_rate, ean, title, description, category, weight_grams, barcode, cost_price, supplier, active) are automatically ignored.'
      });
      return;
    }

    // Get default location for merchant
    let defaultLocation = await LocationModel.findOne({
      merchantId: merchant._id,
      type: 'warehouse',
      active: true
    });

    if (!defaultLocation) {
      // Create default warehouse location
      try {
        defaultLocation = await LocationModel.create({
          merchantId: merchant._id,
          type: 'warehouse',
          name: 'Main Warehouse',
          address: merchant.country || 'NL',
          timezone: 'Europe/Amsterdam'
        });
      } catch (locationError) {
        console.error('Error creating default location:', locationError);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: 'Failed to create default location',
          error: locationError instanceof Error ? locationError.message : 'Unknown error'
        });
        return;
      }
    }

    // Process each row with individual error handling
    const errors: Array<{ row: number; error: string }> = [...parseErrors];
    const success: Array<{ merchantSku: string; variant: string }> = [];

    console.log(`[CSV Import] Starting import of ${rows.length} rows for merchant ${merchant._id}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2 + parseErrors.length; // Adjust for skipped rows

              try {
                console.log(`[CSV Import] Processing row ${rowNumber}: merchantSku=${row.merchantSku}, variant=${row.variant_size}/${row.variant_color}, stock=${row.stock}, location_type=${row.location_type}`);

                // Find offer by merchantSku first (this is the primary key for stock import)
                // Also check by variantId to catch all existing offers
                let offer = await MerchantOfferModel.findOne({
                  merchantId: merchant._id,
                  $or: [
                    { merchantSku: row.merchantSku },
                    // We'll add variantId check after we find the variant
                  ]
                }).populate('variantId');

                // If offer doesn't exist, try to auto-create it by finding variant
                // But first, try to find variant to check if offer exists by variantId
                let variant: any = null;
                
                if (!offer) {
                  console.log(`[CSV Import] Row ${rowNumber}: Offer not found for merchantSku "${row.merchantSku}", attempting to find variant and create offer...`);
                  
                  // Try to find variant by size and colorCode (exact match first)
                  variant = await ProductVariantModel.findOne({
                    size: row.variant_size,
                    colorCode: row.variant_color
                  });

                  // If not found, try case-insensitive and flexible matching
                  if (!variant) {
                    // Try case-insensitive match with regex
                    const colorRegex = new RegExp(row.variant_color.replace(/\//g, '.*'), 'i');
                    variant = await ProductVariantModel.findOne({
                      size: row.variant_size,
                      colorCode: { $regex: colorRegex }
                    });
                  }

                  // If still not found, try to find by product code from merchantSku
                  if (!variant) {
                    const productCodeMatch = row.merchantSku.match(/^([A-Z]+[0-9]+)/);
                    if (productCodeMatch) {
                      const productCode = productCodeMatch[1];
                      const productMaster = await (await import('../models/ProductMaster.js')).ProductMasterModel.findOne({
                        $or: [{ modelId: productCode }, { vendorCode: productCode }]
                      });
                      
                      if (productMaster) {
                        // Try to find variant with similar color (handle "White/Black" vs "White Black" etc)
                        const colorVariations = [
                          row.variant_color,
                          row.variant_color.replace(/\//g, ' '),
                          row.variant_color.replace(/\//g, '-'),
                          row.variant_color.split('/')[0], // Just first part
                        ];
                        
                        for (const colorVar of colorVariations) {
                          variant = await ProductVariantModel.findOne({
                            masterId: productMaster._id,
                            size: row.variant_size,
                            colorCode: { $regex: new RegExp(colorVar.replace(/\//g, '.*'), 'i') }
                          });
                          if (variant) break;
                        }
                      }
                    }
                  }

                  if (!variant) {
                    const errorMsg = `Variant not found: ${row.variant_size} / ${row.variant_color}. Please create the product variant first in PIM (Producten tab → PIM section), then try importing again. The variant must exist before you can import stock.`;
                    console.log(`[CSV Import] Row ${rowNumber} error: ${errorMsg}`);
                    errors.push({
                      row: rowNumber,
                      error: errorMsg
                    });
                    continue;
                  }

                  // Now that we have the variant, check if offer exists by variantId
                  // This is critical to avoid duplicate key errors
                  let existingOffer = await MerchantOfferModel.findOne({
                    merchantId: merchant._id,
                    variantId: variant._id
                  });

                  // If found by variantId, use it
                  if (existingOffer) {
                    offer = existingOffer;
                  } else {
                    // Also check by merchantSku in case it was created with a different variant
                    existingOffer = await MerchantOfferModel.findOne({
                      merchantId: merchant._id,
                      merchantSku: row.merchantSku
                    });
                    if (existingOffer) {
                      offer = existingOffer;
                    }
                  }

                  if (offer) {
                    // Use existing offer and update merchantSku if needed
                    let updated = false;
                    
                    if (offer.merchantSku !== row.merchantSku) {
                      offer.merchantSku = row.merchantSku;
                      updated = true;
                    }
                    
                    // If variantId doesn't match, we need to be careful
                    if (offer.variantId.toString() !== variant._id.toString()) {
                      // Check if there's already an offer for this variant
                      const offerForVariant = await MerchantOfferModel.findOne({
                        merchantId: merchant._id,
                        variantId: variant._id
                      });
                      
                      if (offerForVariant) {
                        // Use the offer that matches the variant instead
                        offer = offerForVariant;
                        if (offer.merchantSku !== row.merchantSku) {
                          offer.merchantSku = row.merchantSku;
                          updated = true;
                        }
                      } else {
                        // Update the existing offer to use the correct variant
                        offer.variantId = variant._id;
                        updated = true;
                      }
                    }
                    
                    if (updated) {
                      await offer.save();
                      console.log(`[CSV Import] Row ${rowNumber}: Updated existing offer ${offer._id}`);
                    }
                    
                    await offer.populate('variantId');
                    console.log(`[CSV Import] Row ${rowNumber}: Using existing offer ${offer._id} for variant ${variant._id}`);
                  } else {
                    // No existing offer found - create new one
                    // Use direct MongoDB operation with upsert to avoid race conditions
                    try {
                      console.log(`[CSV Import] Row ${rowNumber}: Creating new offer for variant ${variant._id} with merchantSku "${row.merchantSku}"`);
                      
                      const db = mongoose.connection.db;
                      if (!db) {
                        throw new Error('Database connection not available');
                      }
                      const offersCollection = db.collection('merchantoffers');
                      
                      // Use MongoDB upsert to handle race conditions atomically
                      const result = await offersCollection.findOneAndUpdate(
                        {
                          merchantId: merchant._id,
                          variantId: variant._id
                        },
                        {
                          $setOnInsert: {
                            merchantId: merchant._id,
                            variantId: variant._id,
                            merchantSku: row.merchantSku,
                            status: 'active',
                            listingCountries: ['NL'],
                            createdAt: new Date(),
                            updatedAt: new Date()
                          },
                          $set: {
                            merchantSku: row.merchantSku,
                            updatedAt: new Date()
                          }
                        },
                        {
                          upsert: true,
                          returnDocument: 'after'
                        }
                      );
                      
                      // Load the offer using Mongoose to get populated fields
                      if (!result || !result.value || !result.value._id) {
                        throw new Error('Failed to create offer: no ID returned');
                      }
                      offer = await MerchantOfferModel.findById(result.value._id).populate('variantId');
                      
                      if (!offer) {
                        throw new Error('Failed to load created offer');
                      }
                      
                      console.log(`[CSV Import] Row ${rowNumber}: Offer created/updated: ${offer._id}`);
                    } catch (createError) {
                      // If still duplicate key error, try to find the existing offer one more time
                      if (createError instanceof Error && createError.message.includes('E11000')) {
                        console.log(`[CSV Import] Row ${rowNumber}: Duplicate key error, searching for existing offer...`);
                        const existingOffer = await MerchantOfferModel.findOne({
                          merchantId: merchant._id,
                          variantId: variant._id
                        });
                        
                        if (existingOffer) {
                          offer = existingOffer;
                          if (offer.merchantSku !== row.merchantSku) {
                            offer.merchantSku = row.merchantSku;
                            await offer.save();
                          }
                          await offer.populate('variantId');
                          console.log(`[CSV Import] Row ${rowNumber}: Found existing offer after duplicate key error: ${offer._id}`);
                        } else {
                          const errorMsg = `Failed to auto-create offer: ${createError instanceof Error ? createError.message : 'Unknown error'}. Please create the offer manually in the Producten tab.`;
                          console.error(`[CSV Import] Row ${rowNumber} error: ${errorMsg}`, createError);
                          errors.push({
                            row: rowNumber,
                            error: errorMsg
                          });
                          continue;
                        }
                      } else {
                        throw createError;
                      }
                    }
                  }
                }

                console.log(`[CSV Import] Row ${rowNumber}: Found offer ${offer._id} for merchantSku ${row.merchantSku}`);

                // Verify variant matches (optional validation - warn if mismatch)
                const offerVariant = offer.variantId as any;
                if (offerVariant.size !== row.variant_size || offerVariant.colorCode !== row.variant_color) {
                  console.warn(`[CSV Import] Row ${rowNumber}: Variant size/color mismatch. CSV: ${row.variant_size}/${row.variant_color}, Offer: ${offerVariant.size}/${offerVariant.colorCode}. Using offer variant.`);
                }

                // Find or create location based on location_type
                let location = defaultLocation;
                if (row.location_type && row.location_type !== 'warehouse') {
                  // Try to find existing location of this type
                  let foundLocation = await LocationModel.findOne({
                    merchantId: merchant._id,
            type: row.location_type,
            active: true
          });
          
          // If not found, create it
          if (!foundLocation) {
            console.log(`[CSV Import] Row ${rowNumber}: Creating new location of type ${row.location_type}`);
            try {
              foundLocation = await LocationModel.create({
                merchantId: merchant._id,
                type: row.location_type,
                name: row.location_type === 'store' ? 'Fysieke Winkel' : row.location_type === '3pl' ? '3PL Warehouse' : 'Warehouse',
                address: merchant.country || 'NL',
                timezone: 'Europe/Amsterdam',
                active: true
              });
              console.log(`[CSV Import] Row ${rowNumber}: Created location ${foundLocation._id}`);
            } catch (locationError) {
              console.error(`[CSV Import] Row ${rowNumber}: Error creating location:`, locationError);
              errors.push({
                row: rowNumber,
                error: `Failed to create location of type ${row.location_type}: ${locationError instanceof Error ? locationError.message : 'Unknown error'}`
              });
              continue;
            }
          }
          
          if (foundLocation) {
            location = foundLocation;
            console.log(`[CSV Import] Row ${rowNumber}: Using location ${location._id} (${location.type})`);
          }
        } else {
          console.log(`[CSV Import] Row ${rowNumber}: Using default warehouse location ${location._id}`);
        }

        // Update or create stock record
        try {
          await MerchantStockModel.findOneAndUpdate(
            {
              offerId: offer._id,
              locationId: location._id
            },
            {
              availableQty: row.stock,
              posSystem: row.pos_system || 'none',
              posExternalId: row.pos_external_id,
              lastSyncAt: new Date()
            },
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );

          success.push({ 
            merchantSku: row.merchantSku, 
            variant: `${row.variant_size}-${row.variant_color}` 
          });
        } catch (dbError) {
          console.error(`Database error for row ${rowNumber}:`, dbError);
          errors.push({
            row: rowNumber,
            error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
          });
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return results
    const statusCode = success.length > 0 ? StatusCodes.OK : StatusCodes.BAD_REQUEST;
    res.status(statusCode).json({
      message:
        success.length > 0
          ? `Import completed: ${success.length} stocks updated${errors.length > 0 ? `, ${errors.length} errors` : ''}`
          : 'Import failed: no stocks were updated',
      success: success.length,
      errors: errors.length > 0 ? errors.slice(0, 100) : [], // Return array of errors
      errorDetails: errors.length > 0 ? errors.slice(0, 100) : undefined, // Limit error details
      warnings: parseResult.errors && parseResult.errors.length > 0 
        ? `CSV parsing warnings: ${parseResult.errors.length} (non-critical)` 
        : undefined
    });
  } catch (error) {
    console.error('[CSV Import] Top-level error:', error);
    if (error instanceof Error) {
      console.error('[CSV Import] Error name:', error.name);
      console.error('[CSV Import] Error message:', error.message);
      console.error('[CSV Import] Error stack:', error.stack);
    }
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to import CSV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      console.error('[CSV Import] Response already sent, cannot send error response');
    }
  }
};

/**
 * Export stock as CSV
 */
export const exportStockCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    // Find or create merchant
    let merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      // Auto-create merchant for creator users
      merchant = await MerchantModel.create({
        merchantId: req.user._id,
        name: req.user.profile?.name || req.user.email || 'Merchant',
        legalEntity: req.user.profile?.name || req.user.email || 'Merchant',
        country: req.user.profile?.address?.country || 'NL',
        active: true
      });
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
        // Export offer even if no stock
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
    console.error('Export CSV error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to export CSV',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
