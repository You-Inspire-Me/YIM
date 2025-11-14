import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { OrderModel, OrderStatus } from '../models/Order.js';

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
});

export const listOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const hostId = req.user._id;
  const status = req.query.status as OrderStatus | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { host: hostId };
  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter)
  ]);

  res.status(StatusCodes.OK).json({
    items: orders,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const order = await OrderModel.findOne({
    _id: req.params.id,
    host: req.user._id
  }).lean();

  if (!order) {
    res.status(StatusCodes.NOT_FOUND).json({ message: 'Order not found' });
    return;
  }

  res.status(StatusCodes.OK).json({ order });
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const { status } = updateOrderStatusSchema.parse(req.body);

  const order = await OrderModel.findOneAndUpdate(
    { _id: req.params.id, host: req.user._id },
    { status },
    { new: true }
  );

  if (!order) {
    res.status(StatusCodes.NOT_FOUND).json({ message: 'Order not found' });
    return;
  }

  res.status(StatusCodes.OK).json({ order });
};

export const getRecentOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const limit = Number(req.query.limit) || 5;
  const since = req.query.since ? new Date(req.query.since as string) : undefined;

  const filter: Record<string, unknown> = { host: req.user._id };
  if (since) {
    filter.createdAt = { $gte: since };
  }

  const orders = await OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(StatusCodes.OK).json({ orders });
};

