'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/db');

/** Generate a signed JWT for a given user id */
function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/** Hash a password with SHA-256 + a salt (stored alongside) */
function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

/** Generate a random salt */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  // Hash password
  const salt = generateSalt();
  const password_hash = hashPassword(password, salt);

  // Insert new user
  const { data: user, error } = await supabase
    .from('users')
    .insert([{
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      salt,
      role: 'user',
    }])
    .select('id, name, email, role, created_at')
    .single();

  if (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }

  const token = signToken(user.id);
  res.status(201).json({ success: true, token, user });
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  // Fetch user including password_hash + salt
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, password_hash, salt, created_at')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Verify password
  const hash = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken(user.id);

  // Return user without sensitive fields
  const { password_hash, salt, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
async function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

module.exports = { register, login, getMe };
