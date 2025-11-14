import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import streamifier from 'streamifier';

import { cloudinary } from '../config/cloudinary.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

export const uploadSingleImage = upload.single('image');

export const uploadImage = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'No image file provided' });
    return;
  }

  // Check if Cloudinary is configured
  const hasCloudinaryConfig = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret';

  if (!hasCloudinaryConfig) {
    // Fallback: return base64 data URL for development
    console.warn('Cloudinary not configured. Using base64 fallback for development.');
    const base64 = req.file!.buffer.toString('base64');
    const mimeType = req.file!.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;
    res.status(StatusCodes.OK).json({ url: dataUrl });
    return;
  }

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ecommerce-zalando/looks',
          resource_type: 'image'
        },
        (error, result) => {
          if (error || !result) {
            console.error('Cloudinary upload error:', error);
            reject(error || new Error('Upload failed'));
            return;
          }
          resolve(result);
        }
      );

      streamifier.createReadStream(req.file!.buffer).pipe(stream);
    });

    res.status(StatusCodes.OK).json({ url: result.secure_url });
  } catch (error) {
    console.error('Image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Failed to upload image',
      error: errorMessage
    });
  }
};

