import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { startOfDay, endOfDay, subDays } from 'date-fns';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { OrderModel, OrderStatus } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const hostId = req.user._id;
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const last30Days = subDays(new Date(), 30);

  const [totalSales, ordersToday, totalRevenue, recentOrders, lowStockProducts, totalProducts] = await Promise.all([
    OrderModel.countDocuments({ host: hostId, status: { $ne: 'cancelled' } }),
    OrderModel.countDocuments({
      host: hostId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: 'cancelled' }
    }),
    OrderModel.aggregate([
      { $match: { host: hostId, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    OrderModel.find({ host: hostId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    ProductModel.find({ host: hostId, inventory: { $lt: 10 }, isPublished: true })
      .select('title inventory')
      .limit(10)
      .lean(),
    ProductModel.countDocuments({ host: hostId })
  ]);

  const revenue = totalRevenue[0]?.total ?? 0;
  const revenueLast30Days = await OrderModel.aggregate([
    {
      $match: {
        host: hostId,
        createdAt: { $gte: last30Days },
        status: { $ne: 'cancelled' }
      }
    },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);

  res.status(StatusCodes.OK).json({
    stats: {
      totalSales,
      ordersToday,
      totalRevenue: revenue,
      revenueLast30Days: revenueLast30Days[0]?.total ?? 0,
      totalProducts,
      lowStockCount: lowStockProducts.length
    },
    recentOrders,
    lowStockProducts
  });
};

export const getRevenueChart = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const hostId = req.user._id;
  const days = Number(req.query.days) || 30;
  const startDate = subDays(new Date(), days);

  const revenueData = await OrderModel.aggregate([
    {
      $match: {
        host: hostId,
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(StatusCodes.OK).json({ data: revenueData });
};

export const getTopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const hostId = req.user._id;
  const limit = Number(req.query.limit) || 10;

  const topProducts = await OrderModel.aggregate([
    { $match: { host: hostId, status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        title: { $first: '$items.title' },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit }
  ]);

  res.status(StatusCodes.OK).json({ products: topProducts });
};

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const hostId = req.user._id;
  const last30Days = subDays(new Date(), 30);

  const [totalViews, totalOrders, conversionRate, products] = await Promise.all([
    ProductModel.aggregate([
      { $match: { host: hostId } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]),
    OrderModel.countDocuments({
      host: hostId,
      createdAt: { $gte: last30Days },
      status: { $ne: 'cancelled' }
    }),
    ProductModel.countDocuments({ host: hostId, isPublished: true }),
    ProductModel.find({ host: hostId }).select('views').lean()
  ]);

  const views = totalViews[0]?.total ?? 0;
  const conversion = products.length > 0 ? ((totalOrders / views) * 100).toFixed(2) : '0.00';

  res.status(StatusCodes.OK).json({
    totalViews: views,
    totalOrders,
    conversionRate: parseFloat(conversion),
    publishedProducts: conversionRate
  });
};

