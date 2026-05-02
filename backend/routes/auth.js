const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';
const makeToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });

    const { password: _, ...userData } = user.toJSON();
    res.status(201).json({ token: makeToken(user.id), user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _, ...userData } = user.toJSON();
    res.json({ token: makeToken(user.id), user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

// PUT /api/auth/profile
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const { name, avatar } = req.body;
    await req.user.update({ name, avatar });
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
