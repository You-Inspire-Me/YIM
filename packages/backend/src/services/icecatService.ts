import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { cloudinary } from '../config/cloudinary.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Icecat Open Catalog - FREE product data enrichment
 * 1000 calls/day, no registration needed
 */

export interface IcecatProduct {
  title: string;
  description: string;
  brand: string;
  images: string[];
  specs: {
    size?: string;
    color?: string;
    material?: string;
    weight?: string;
    [key: string]: string | undefined;
  };
  ean: string;
}

/**
 * Upload image URL to Cloudinary
 */
async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  try {
    // Check if Cloudinary is configured
    const hasCloudinaryConfig = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret';

    if (!hasCloudinaryConfig) {
      // Fallback: return original URL
      console.warn('Cloudinary not configured. Using original image URL.');
      return imageUrl;
    }

    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ecommerce-zalando/products/icecat',
          resource_type: 'image',
          format: 'auto',
          quality: 'auto'
        },
        (error, result) => {
          if (error || !result) {
            console.error('Cloudinary upload error:', error);
            // Fallback to original URL
            resolve(imageUrl);
            return;
          }
          resolve(result.secure_url);
        }
      );

      stream.end(Buffer.from(imageResponse.data));
    });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    // Fallback to original URL
    return imageUrl;
  }
}

/**
 * Parse Icecat XML to structured product data
 */
function parseIcecatXml(xml: string): IcecatProduct | null {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true
    });

    const json = parser.parse(xml);

    // Navigate through Icecat XML structure
    const product = json?.ICECAT?.Product || json?.Product;
    if (!product) {
      return null;
    }

    // Extract basic info
    const title = product['@_Title'] || product.Title?.['#text'] || product['@_Name'] || '';
    const description = product.Summary?.LongSummary?.['#text'] || 
                       product.Summary?.ShortSummary?.['#text'] || 
                       product.Description?.['#text'] || 
                       '';
    
    // Extract brand
    const brand = product.Supplier?.['@_Name'] || 
                  product.Brand?.['@_Name'] || 
                  product['@_Supplier'] || 
                  '';

    // Extract images
    const productPictures = product.ProductPictures?.ProductPicture || [];
    const images: string[] = [];
    
    if (Array.isArray(productPictures)) {
      for (const pic of productPictures) {
        const picUrl = pic['@_Pic'] || pic['@_HighPic'] || pic['@_LowPic'] || '';
        if (picUrl) {
          // Icecat URLs are relative, need to prepend base URL
          const fullUrl = picUrl.startsWith('http') 
            ? picUrl 
            : `https://images.icecat.biz/img${picUrl}`;
          images.push(fullUrl);
        }
      }
    } else if (productPictures) {
      const picUrl = productPictures['@_Pic'] || productPictures['@_HighPic'] || productPictures['@_LowPic'] || '';
      if (picUrl) {
        const fullUrl = picUrl.startsWith('http') 
          ? picUrl 
          : `https://images.icecat.biz/img${picUrl}`;
        images.push(fullUrl);
      }
    }

    // Extract EAN
    const ean = product['@_EAN_UPC'] || product.EAN?.['#text'] || '';

    // Extract specs from ProductFeature
    const specs: Record<string, string> = {};
    const productFeatures = product.ProductFeature || [];
    const featuresArray = Array.isArray(productFeatures) ? productFeatures : [productFeatures];

    for (const feature of featuresArray) {
      if (!feature) continue;
      
      const featureName = feature['@_Name'] || feature.Feature?.['@_Name'] || '';
      const featureValue = feature['@_Value'] || 
                          feature.Value?.['#text'] || 
                          feature.Value?.['@_Value'] || 
                          '';

      if (featureName && featureValue) {
        // Normalize feature names
        const normalizedName = featureName.toLowerCase().trim();
        
        // Map common Icecat features to our schema
        if (normalizedName.includes('size') || normalizedName.includes('maat')) {
          specs.size = featureValue;
        } else if (normalizedName.includes('color') || normalizedName.includes('kleur')) {
          specs.color = featureValue;
        } else if (normalizedName.includes('material') || normalizedName.includes('materiaal')) {
          specs.material = featureValue;
        } else if (normalizedName.includes('weight') || normalizedName.includes('gewicht')) {
          specs.weight = featureValue;
        }
        
        // Store all features
        specs[featureName] = featureValue;
      }
    }

    return {
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim(),
      images: images.filter(Boolean),
      specs,
      ean: ean.trim()
    };
  } catch (error) {
    console.error('Error parsing Icecat XML:', error);
    return null;
  }
}

/**
 * Lookup product by EAN using Icecat Open Catalog
 * Uses Redis cache (24h TTL) to save API calls
 */
export async function lookupProductByEAN(ean: string): Promise<IcecatProduct | null> {
  try {
    // Validate EAN (8, 12, 13, or 14 digits)
    const cleanEAN = ean.replace(/\D/g, '');
    if (cleanEAN.length < 8 || cleanEAN.length > 14) {
      throw new Error('Invalid EAN format');
    }

    // Check Redis cache first
    const cacheKey = `icecat:ean:${cleanEAN}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Icecat] Cache hit for EAN: ${cleanEAN}`);
        return JSON.parse(cached) as IcecatProduct;
      }
    } catch (cacheError) {
      console.warn('[Icecat] Redis cache error (continuing):', cacheError);
      // Continue without cache if Redis fails
    }

    // Call Icecat API with API key if available
    const apiKey = env.ICECAT_API_KEY || '';
    const apiKeyParam = apiKey ? `&username=${apiKey}` : '';
    
    // Try multiple endpoints for better compatibility
    const urls = [
      `https://data.icecat.biz/xml_s3/xml_server3.cgi?ean_upc=${cleanEAN}&lang=nl&output=productxml${apiKeyParam}`,
      `https://data.icecat.biz/xml_s3/xml_server3.cgi?ean_upc=${cleanEAN}&lang=en&output=productxml${apiKeyParam}`,
      `https://data.icecat.biz/xml_s3/xml_server3.cgi?ean_upc=${cleanEAN}&output=productxml${apiKeyParam}`
    ];
    
    console.log(`[Icecat] Looking up EAN: ${cleanEAN}`);
    
    let response;
    let lastError;
    
    // Try each URL until one works
    for (const url of urls) {
      try {
        response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YIM-Creator-Studio/1.0)',
            'Accept': 'application/xml, text/xml, */*'
          },
          validateStatus: (status) => status < 500 // Don't throw on 4xx, only 5xx
        });
        
        // If we got a response (even 404), break and process it
        if (response.status < 500) {
          break;
        }
      } catch (error) {
        lastError = error;
        continue; // Try next URL
      }
    }
    
    if (!response) {
      console.error('[Icecat] All API endpoints failed:', lastError);
      return null;
    }

    // Handle different response statuses
    if (response.status === 401 || response.status === 403) {
      console.warn(`[Icecat] Access denied (${response.status}) for EAN: ${cleanEAN}. This EAN may require authentication or not be available in the free catalog.`);
      return null;
    }
    
    if (response.status === 404) {
      console.log(`[Icecat] Product not found (404) for EAN: ${cleanEAN}`);
      return null;
    }
    
    if (response.status !== 200) {
      console.warn(`[Icecat] Unexpected status ${response.status} for EAN: ${cleanEAN}`);
      return null;
    }

    if (!response.data || typeof response.data !== 'string') {
      return null;
    }

    // Check for error responses in XML
    if (response.data.includes('Code="1"') || 
        response.data.includes('not found') ||
        response.data.includes('<Error>') ||
        response.data.includes('Product not found')) {
      console.log(`[Icecat] Product not found in response for EAN: ${cleanEAN}`);
      return null;
    }

    // Parse XML
    const product = parseIcecatXml(response.data);
    
    if (!product) {
      return null;
    }

    // Upload images to Cloudinary (async, don't block)
    if (product.images.length > 0) {
      try {
        const uploadedImages = await Promise.all(
          product.images.slice(0, 5).map(img => uploadImageToCloudinary(img))
        );
        product.images = uploadedImages.filter(Boolean);
      } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        // Keep original URLs as fallback
      }
    }

    // Cache result in Redis (24 hours)
    try {
      await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(product));
      console.log(`[Icecat] Cached result for EAN: ${cleanEAN}`);
    } catch (cacheError) {
      console.warn('[Icecat] Redis cache error (continuing):', cacheError);
      // Continue even if cache fails
    }

    return product;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        // Cache "not found" result for 1 hour to avoid repeated API calls
        const cleanEAN = ean.replace(/\D/g, '');
        const cacheKey = `icecat:ean:${cleanEAN}`;
        try {
          await redis.setex(cacheKey, 60 * 60, JSON.stringify(null));
        } catch (cacheError) {
          // Ignore cache errors
        }
        return null; // Product not found
      }
      console.error('[Icecat] API error:', error.message);
    } else {
      console.error('[Icecat] Error:', error);
    }
    return null;
  }
}

