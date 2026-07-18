const User = require('../models/User');
const { signToken } = require('../middleware/auth');

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    const user = new User({ username, email });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error('[auth] register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastSeenAt = new Date();
    await user.save();

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
}

async function me(req, res) {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: user.toPublicJSON() });
}

module.exports = { register, login, me };
