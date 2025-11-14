// packages/backend/src/routes/looks.ts
import express from 'express';
import { LookModel } from '../models/Look';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// GET: Alle looks (host ziet alles, klant alleen published)
router.get('/', async (req, res) => {
  const isHost = req.user?.role === 'host';
  const filter = isHost ? {} : { published: true };
  const looks = await LookModel.find(filter)
    .populate('creatorId', 'name')
    .populate('products', 'title images price')
    .sort({ createdAt: -1 });
  res.json(looks);
});

// POST: Maak look
router.post('/', authMiddleware(['host']), async (req, res) => {
  const look = new LookModel({ ...req.body, creatorId: req.user.id });
  await look.save();
  const populated = await LookModel.findById(look._id)
    .populate('creatorId', 'name')
    .populate('products', 'title images price');
  res.status(201).json(populated);
});

// GET: Look detail
router.get('/:id', async (req, res) => {
  const look = await LookModel.findById(req.params.id)
    .populate('creatorId', 'name')
    .populate('products', 'title images price');
  if (!look) return res.status(404).json({ error: 'Not found' });
  res.json(look);
});

// POST: Like toggle
router.post('/:id/like', authMiddleware(), async (req, res) => {
  const look = await LookModel.findById(req.params.id);
  if (!look) return res.status(404).json({ error: 'Not found' });

  const userId = req.user.id;
  const index = look.likes.indexOf(userId);
  if (index > -1) {
    look.likes.splice(index, 1);
  } else {
    look.likes.push(userId);
  }
  look.likesCount = look.likes.length;
  await look.save();

  res.json({ liked: index === -1, likesCount: look.likesCount });
});

export default router;