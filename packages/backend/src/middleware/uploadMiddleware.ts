import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import streamifier from 'streamifier';

import { cloudinary } from '../config/cloudinary.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  }
});

export const uploadImages = upload.array('images', 5);

export const processImages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.files || !Array.isArray(req.files)) {
    next();
    return;
  }

  try {
    const uploadPromises = req.files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'ecommerce-zalando/products',
              resource_type: 'image'
            },
            (error, result) => {
              if (error || !result) {
                reject(error);
                return;
              }
              resolve(result.secure_url);
            }
          );

          streamifier.createReadStream(file.buffer).pipe(stream);
        })
    );

    const imageUrls = await Promise.all(uploadPromises);
    (req as Request & { imageUrls?: string[] }).imageUrls = imageUrls;
    next();
  } catch (error) {
    next(error);
  }
};
