import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { lookupProductByEAN } from '../services/icecatService.js';

/**
 * Lookup product by EAN using Icecat
 * GET /api/creator/icecat/lookup?ean=1234567890123
 */
export const lookupEAN = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { ean } = req.query;

    if (!ean || typeof ean !== 'string') {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'EAN parameter is required' 
      });
      return;
    }

    console.log(`[Icecat] EAN lookup request: ${ean}`);

    const product = await lookupProductByEAN(ean);

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ 
        message: 'Geen product gevonden – vul handmatig in',
        found: false
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      message: 'Product gevonden',
      found: true,
      product
    });
  } catch (error) {
    console.error('Icecat lookup error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Fout bij opzoeken van product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

