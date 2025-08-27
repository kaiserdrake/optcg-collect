import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { query } from './db.js';
import { isAuthenticated, isAdmin } from './auth.js';
import crypto from 'crypto';
import { exec } from 'child_process';

dotenv.config();

const app = express();
const port = 3001;

// Manual CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// --- AUTHENTICATION & USER ROUTES ---

app.post('/api/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: "Username/email and password are required." });
    }
    try {
        let userResult;
        if (usernameOrEmail.includes('@')) {
            userResult = await query('SELECT * FROM users WHERE email = $1', [usernameOrEmail]);
        } else {
            userResult = await query('SELECT * FROM users WHERE name = $1', [usernameOrEmail]);
        }
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const user = userResult.rows[0];
        if (!user.password_hash) {
            return res.status(401).json({ message: "User has not set a password yet." });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const tokenPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({ message: "Login successful", user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: "Server error during login." });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful.' });
});

app.get('/api/users/me', isAuthenticated, (req, res) => {
    res.json(req.user);
});

app.put('/api/users/change-password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (userId === 1) {
        return res.status(403).json({ message: "The initial admin's password cannot be changed." });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) { return res.status(404).json({ message: 'User not found.' }); }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) { return res.status(401).json({ message: 'Incorrect current password.' }); }
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);
        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
});

app.delete('/api/users/me', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    if (userId === 1) {
        return res.status(403).json({ message: "The primary admin account cannot be deleted from this page." });
    }
    try {
        await query('DELETE FROM users WHERE id = $1', [userId]);
        res.clearCookie('token');
        res.json({ message: 'Account and all associated data deleted successfully.' });
    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).json({ message: 'Server error while deleting account.' });
    }
});


// --- ADMIN-ONLY USER MANAGEMENT ROUTES ---
app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    const { email, name, role } = req.body;
    if (!email || !name || !role) { return res.status(400).json({ message: 'Email, name, and role are required.' }); }
    try {
        const randomPassword = crypto.randomBytes(8).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPassword, salt);
        const newUser = await query('INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id', [email, name, role, passwordHash]);
        res.status(201).json({
            message: 'User registered successfully.',
            newUser: { id: newUser.rows[0].id, email, name, role },
            password: randomPassword
        });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint === 'users_email_key') { return res.status(409).json({ message: 'Error: An account with this email already exists.' }); }
            if (err.constraint === 'users_name_key') { return res.status(409).json({ message: 'Error: This username is already taken.' }); }
        }
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Failed to register user.' });
    }
});

app.put('/api/users/:id/password', isAuthenticated, isAdmin, async (req, res) => {
    const { newPassword } = req.body;
    const userIdToChange = parseInt(req.params.id, 10);
    const adminUserId = req.user.id;
    if (userIdToChange === 1) {
        return res.status(403).json({ message: "The initial admin account cannot be modified." });
    }
    if (userIdToChange === adminUserId) {
        return res.status(400).json({ message: "Admin cannot change their own password here. Please use the Settings page." });
    }
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userIdToChange]);
        res.json({ message: `Password for user ID ${userIdToChange} updated successfully.` });
    } catch (err) {
        console.error('Error changing user password:', err);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const adminUserId = req.user.id;
    if (userIdToDelete === 1) {
        return res.status(403).json({ message: "The initial admin account cannot be deleted." });
    }
    if (userIdToDelete === adminUserId) { return res.status(400).json({ message: "Admin cannot delete their own account." }); }
    try {
        const result = await query('DELETE FROM users WHERE id = $1', [userIdToDelete]);
        if (result.rowCount === 0) { return res.status(404).json({ message: 'User not found.' }); }
        res.status(200).json({ message: 'User and all their owned cards deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/sync/stream', isAuthenticated, isAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendLog = (log) => {
        res.write(`data: ${log}\n\n`);
    };

    sendLog('SYNC_START: Starting card list sync...');
    const syncProcess = exec('npm run db:update', { cwd: '/usr/src/app' });

    syncProcess.stdout.on('data', (data) => {
        data.toString().split('\n').forEach(line => {
            if (line.trim()) sendLog(line.trim());
        });
    });

    syncProcess.stderr.on('data', (data) => {
        data.toString().split('\n').forEach(line => {
            if (line.trim()) sendLog(`ERROR: ${line.trim()}`);
        });
    });

    syncProcess.on('close', (code) => {
        sendLog(`SYNC_END: Process finished with code ${code}.`);
        res.end();
    });
});


// --- COLLECTION & CARD ROUTES ---

app.post('/api/collection/update', isAuthenticated, async (req, res) => {
    const { card_id, type, action } = req.body;
    const userId = req.user.id;
    if (!card_id || !type || !action) { return res.status(400).json({ message: 'card_id, type, and action are required.' }); }
    const is_proxy = type === 'proxy';
    try {
        await query('BEGIN');
        const countResult = await query('SELECT COUNT(*) FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = $3', [userId, card_id, is_proxy]);
        const currentCount = parseInt(countResult.rows[0].count, 10);
        if (action === 'increment') {
            if (currentCount >= 99) { await query('ROLLBACK'); return res.status(400).json({ message: 'Cannot own more than 99 copies.' }); }
            await query('INSERT INTO owned_cards (user_id, card_id, is_proxy) VALUES ($1, $2, $3)', [userId, card_id, is_proxy]);
        } else if (action === 'decrement') {
            if (currentCount <= 0) { await query('ROLLBACK'); return res.status(400).json({ message: 'Count cannot be less than zero.' }); }
            await query(`DELETE FROM owned_cards WHERE instance_id = (SELECT instance_id FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = $3 LIMIT 1)`, [userId, card_id, is_proxy]);
        }
        const newCountsResult = await query(`SELECT COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count, COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count FROM owned_cards WHERE user_id = $1 AND card_id = $2`, [userId, card_id]);
        await query('COMMIT');
        res.json({
            owned_count: parseInt(newCountsResult.rows[0].owned_count, 10),
            proxy_count: parseInt(newCountsResult.rows[0].proxy_count, 10)
        });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Error updating collection count:', err);
        res.status(500).json({ message: 'Server error while updating collection.' });
    }
});

app.get('/api/cards/search', isAuthenticated, async (req, res) => {
  const { keyword, ownedOnly, showProxies } = req.query;
  const userId = req.user.id;
  if (!keyword) { return res.status(400).json({ error: 'Search keyword is required' }); }
  try {
    let fuzzyText = keyword;
    const criteria = { id: null, pack: null, color: null };

    const regex = /(\w+):("([^"]+)"|(\S+))/g;
    let match;
    while ((match = regex.exec(keyword)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[3] || match[4];
      if (key === 'id') criteria.id = value;
      if (key === 'pack') criteria.pack = value;
      if (key === 'color') criteria.color = value;
    }

    fuzzyText = keyword.replace(regex, '').trim();

    let baseQuery = `
      SELECT
        c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter, c.effect, c.trigger_effect, c.img_url,
        c.attributes, c.types, c.block, c.rarity, c.cost,
        COALESCE(oc.owned_count, 0) AS owned_count,
        COALESCE(oc.proxy_count, 0) AS proxy_count,
        STRING_AGG(DISTINCT cpa.pack_code, ', ') AS packs
      FROM cards c
      LEFT JOIN (
        SELECT card_id, COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count, COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count
        FROM owned_cards WHERE user_id = $2 GROUP BY card_id
      ) AS oc ON c.id = oc.card_id
      LEFT JOIN card_pack_appearances cpa ON c.id = cpa.card_id
    `;

    const whereClauses = [];
    const params = [fuzzyText || '', userId];
    let paramIndex = 3;

    if (fuzzyText) {
      whereClauses.push(`GREATEST(
          similarity(COALESCE(c.name, ''), $1), similarity(COALESCE(c.id, ''), $1),
          similarity(COALESCE(c.card_code, ''), $1), similarity(COALESCE(c.effect, ''), $1),
          similarity(COALESCE(c.category, ''), $1), similarity(COALESCE(c.trigger_effect, ''), $1),
          similarity(array_to_string(c.attributes, ' '), $1),
          similarity(array_to_string(c.types, ' '), $1)
        ) > 0.15`);
    }

    if (criteria.id) {
      whereClauses.push(`(c.id ILIKE $${paramIndex} OR c.card_code ILIKE $${paramIndex})`);
      params.push(`${criteria.id}%`);
      paramIndex++;
    }

    if (criteria.pack) {
      whereClauses.push(`EXISTS (
          SELECT 1 FROM card_pack_appearances cpa_filter
          WHERE cpa_filter.card_id = c.id AND cpa_filter.pack_code ILIKE $${paramIndex}
        )`);
      params.push(`${criteria.pack}%`);
      paramIndex++;
    }

    if (criteria.color) {
      whereClauses.push(`c.color ILIKE $${paramIndex}`);
      params.push(criteria.color);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }
    baseQuery += ` GROUP BY c.id, oc.owned_count, oc.proxy_count`;

    const orderByClauses = [];
    if (criteria.color) {
        const colorParamIndex = params.findIndex(p => p === criteria.color) + 1;
        if (colorParamIndex > 0) {
            orderByClauses.push(`CASE WHEN c.color ILIKE $${colorParamIndex} THEN 0 ELSE 1 END`);
        }
    }
    if (criteria.id) {
        const idParamIndex = params.findIndex(p => p === `${criteria.id}%`) + 1;
        if (idParamIndex > 0) {
            orderByClauses.push(`CASE WHEN c.id ILIKE $${idParamIndex} OR c.card_code ILIKE $${idParamIndex} THEN 0 ELSE 1 END`);
        }
    }
    if (fuzzyText) {
        orderByClauses.push(`GREATEST(similarity(c.name, $1), similarity(c.id, $1), similarity(c.card_code, $1)) DESC`);
    }
    orderByClauses.push('c.name ASC');
    if (orderByClauses.length > 0) {
        baseQuery += ' ORDER BY ' + orderByClauses.join(', ');
    }
    baseQuery += ' LIMIT 50;';
    const results = await query(baseQuery, params);
    res.json(results.rows);
  } catch (err) {
    console.error('Error executing search query:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
