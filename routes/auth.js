const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const cryptoUtil = require('../utils/crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_personal_use_only';

// Check if user exists (to determine whether to show login or register)
router.get('/check', async (req, res) => {
    try {
        const result = await db('users').count('* as count').first();
        const count = parseInt(result.count || 0, 10);
        res.json({ hasUser: count > 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database check failed' });
    }
});

// Register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        const result = await db('users').count('* as count').first();
        const userCount = parseInt(result.count || 0, 10);
        
        if (userCount > 0) {
            return res.status(403).json({ error: 'A user is already registered. This is a personal app.' });
        }
        
        const passwordHash = await bcrypt.hash(password, 12);
        const salt = cryptoUtil.generateSalt();
        
        const insertResult = await db('users').insert({
            username,
            password_hash: passwordHash,
            encryption_salt: salt
        }).returning('id');
        
        // Handle postgres returning vs sqlite returning
        const insertId = typeof insertResult[0] === 'object' ? insertResult[0].id : insertResult[0];
        
        // Derive key for JWT
        const key = cryptoUtil.deriveKey(password, salt);
        
        const token = jwt.sign({
            id: insertId,
            username: username,
            key: key.toString('hex') // Store the derived AES key in the token payload
        }, JWT_SECRET, { expiresIn: '1d' });
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.json({ message: 'Registered successfully', username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        const user = await db('users').where({ username }).first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const key = cryptoUtil.deriveKey(password, user.encryption_salt);
        
        const token = jwt.sign({
            id: user.id,
            username: user.username,
            key: key.toString('hex')
        }, JWT_SECRET, { expiresIn: '1d' });
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.json({ message: 'Logged in successfully', username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
});

// Get current user info
router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ username: decoded.username });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
