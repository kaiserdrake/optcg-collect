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

// Debug middleware to log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  console.log(`[${timestamp}] Headers:`, {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50),
    'referer': req.headers['referer'],
    'origin': req.headers['origin']
  });

  // Log request completion
  res.on('finish', () => {
    console.log(`[${timestamp}] Response: ${res.statusCode} for ${req.method} ${req.url}`);
  });

  next();
});

// Improved CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://opcc-frontend:3000'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

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

app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await query('SELECT 1');
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: err.message
        });
    }
});

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

app.delete('/api/users/me/collection', isAuthenticated, async (req, res) => {
    const userId = req.user.id;

    try {
        await query('BEGIN');

        // Count how many cards will be deleted (for response message)
        const countResult = await query(
            'SELECT COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count, COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count FROM owned_cards WHERE user_id = $1',
            [userId]
        );

        const ownedCount = parseInt(countResult.rows[0].owned_count, 10);
        const proxyCount = parseInt(countResult.rows[0].proxy_count, 10);
        const totalCount = ownedCount + proxyCount;

        // Delete all owned and proxy cards for this user
        const deleteResult = await query('DELETE FROM owned_cards WHERE user_id = $1', [userId]);

        await query('COMMIT');

        res.json({
            message: 'Collection deleted successfully.',
            deletedCards: {
                owned: ownedCount,
                proxy: proxyCount,
                total: totalCount
            }
        });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Error deleting collection:', err);
        res.status(500).json({ message: 'Server error while deleting collection.' });
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

// Fixed search endpoint with location information (based on original working version)
app.get('/api/cards/search', isAuthenticated, async (req, res) => {
  const { keyword, ownedOnly, showProxies } = req.query;
  const userId = req.user.id;

  // Allow empty keyword ONLY if ownedOnly or showProxies is true
  const allowEmptyKeyword = ownedOnly === 'true' || showProxies === 'true';

  if (typeof keyword !== 'string') {
    return res.status(400).json({ error: 'Search keyword is required and must be a string' });
  }

  // Sanitize keyword to prevent potential issues
  const sanitizedKeyword = keyword.trim();

  if (sanitizedKeyword.length === 0 && !allowEmptyKeyword) {
    return res.status(400).json({ error: 'Search keyword cannot be empty' });
  }

  try {
    let fuzzyText = sanitizedKeyword;
    const criteria = { id: null, pack: null, color: null, exact: null };

    const regex = /(\w+):("([^"]+)"|(\S+))/g;
    let match;
    while ((match = regex.exec(sanitizedKeyword)) !== null) {
      const key = match[1].toLowerCase();
      const value = (match[3] || match[4]).trim();
      if (key === 'id' && value.length > 0) criteria.id = value;
      if (key === 'pack' && value.length > 0) criteria.pack = value;
      if (key === 'color' && value.length > 0) criteria.color = value;
      if (key === 'exact' && value.length > 0) criteria.exact = value;
    }

    fuzzyText = sanitizedKeyword.replace(regex, '').trim();

    const hasValidCriteria =
      (fuzzyText && fuzzyText.length > 0) ||
      criteria.id ||
      criteria.pack ||
      criteria.color ||
      criteria.exact;

    if (!hasValidCriteria && !allowEmptyKeyword) {
      return res.status(400).json({ error: 'Search keyword cannot be empty' });
    }

    // Base query with location information added
    let baseQuery = `
      SELECT
        c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter, c.effect, c.trigger_effect, c.img_url,
        c.attributes, c.types, c.block, c.rarity, c.cost,
        COALESCE(oc.owned_count, 0) AS owned_count,
        COALESCE(oc.proxy_count, 0) AS proxy_count,
        l.id AS location_id,
        l.name AS location_name,
        l.type AS location_type,
        l.marker AS location_marker,
        STRING_AGG(DISTINCT cpa.pack_code, ', ') AS packs
      FROM cards c
      LEFT JOIN (
        SELECT card_id,
               COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count,
               COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count,
               (SELECT location_id FROM owned_cards WHERE card_id = oc.card_id AND user_id = $1 AND is_proxy = false LIMIT 1) AS location_id
        FROM owned_cards oc
        WHERE user_id = $1
        GROUP BY card_id
      ) AS oc ON c.id = oc.card_id
      LEFT JOIN locations l ON oc.location_id = l.id
      LEFT JOIN card_pack_appearances cpa ON c.id = cpa.card_id
    `;

    const whereClauses = [];
    const params = [userId];
    let paramIndex = 2;

    // If this is a "show my collection" request (empty keyword + owned/proxy toggles), do NOT add fuzzyText
    if (!allowEmptyKeyword) {
      if (fuzzyText && fuzzyText.length > 0) {
        whereClauses.push(`GREATEST(
            similarity(COALESCE(c.name, ''), $${paramIndex}),
            similarity(COALESCE(c.id, ''), $${paramIndex}),
            similarity(COALESCE(c.card_code, ''), $${paramIndex}),
            similarity(COALESCE(c.effect, ''), $${paramIndex}),
            similarity(COALESCE(c.category, ''), $${paramIndex}),
            similarity(COALESCE(c.trigger_effect, ''), $${paramIndex}),
            similarity(array_to_string(COALESCE(c.attributes, ARRAY[]::TEXT[]), ' '), $${paramIndex}),
            similarity(array_to_string(COALESCE(c.types, ARRAY[]::TEXT[]), ' '), $${paramIndex})
          ) > 0.15`);
        params.push(fuzzyText);
        paramIndex++;
      }
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
      params.push(`%${criteria.color}%`);
      paramIndex++;
    }

    if (criteria.exact) {
      whereClauses.push(`(
        c.name ILIKE $${paramIndex} OR
        c.effect ILIKE $${paramIndex} OR
        c.trigger_effect ILIKE $${paramIndex} OR
        array_to_string(c.attributes, ' ') ILIKE $${paramIndex} OR
        array_to_string(c.types, ' ') ILIKE $${paramIndex}
      )`);
      params.push(`%${criteria.exact}%`);
      paramIndex++;
    }

    // Updated owned-only filter logic
    if (ownedOnly === 'true') {
      if (showProxies === 'true') {
        // When showProxies is true, consider both owned and proxy cards as "in collection"
        whereClauses.push(`(oc.owned_count > 0 OR oc.proxy_count > 0)`);
      } else {
        // When showProxies is false, only consider owned cards
        whereClauses.push(`oc.owned_count > 0`);
      }
    } else if (showProxies === 'true') {
      // Show all proxies, not just owned
      whereClauses.push(`oc.proxy_count > 0`);
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ` GROUP BY
      c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter, c.effect, c.trigger_effect, c.img_url,
      c.attributes, c.types, c.block, c.rarity, c.cost,
      oc.owned_count, oc.proxy_count, oc.location_id, l.id, l.name, l.type, l.marker
    `;

    const orderByClauses = [];

    // FIXED: More robust parameter finding for ORDER BY clauses
    if (criteria.color) {
        const colorParamValue = `%${criteria.color}%`;
        const colorParamIndex = params.indexOf(colorParamValue);
        if (colorParamIndex !== -1) {
            orderByClauses.push(`CASE WHEN c.color ILIKE $${colorParamIndex + 1} THEN 0 ELSE 1 END`);
        }
    }
    if (criteria.id) {
        const idParamValue = `${criteria.id}%`;
        const idParamIndex = params.indexOf(idParamValue);
        if (idParamIndex !== -1) {
            orderByClauses.push(`CASE WHEN c.id ILIKE $${idParamIndex + 1} OR c.card_code ILIKE $${idParamIndex + 1} THEN 0 ELSE 1 END`);
        }
    }
    if (criteria.exact) {
        const exactParamValue = `%${criteria.exact}%`;
        const exactParamIndex = params.indexOf(exactParamValue);
        if (exactParamIndex !== -1) {
            orderByClauses.push(`CASE WHEN c.name ILIKE $${exactParamIndex + 1} THEN 0 ELSE 1 END`);
        }
    }
    if (!allowEmptyKeyword && fuzzyText && fuzzyText.length > 0) {
        // Find the fuzzyText parameter index for ordering
        const fuzzyParamIndex = params.indexOf(fuzzyText);
        if (fuzzyParamIndex !== -1) {
            orderByClauses.push(`GREATEST(
              similarity(c.name, $${fuzzyParamIndex + 1}),
              similarity(c.id, $${fuzzyParamIndex + 1}),
              similarity(c.card_code, $${fuzzyParamIndex + 1})
            ) DESC`);
        }
    }
    orderByClauses.push('c.name ASC');

    if (orderByClauses.length > 0) {
        baseQuery += ' ORDER BY ' + orderByClauses.join(', ');
    }
    baseQuery += ' LIMIT 50;';

    console.log('Search Query:', baseQuery);
    console.log('Parameters:', params);

    const results = await query(baseQuery, params);

    // Process results to format location information
    const processedResults = results.rows.map(card => ({
      ...card,
      location: card.location_id ? {
        id: card.location_id,
        name: card.location_name,
        type: card.location_type,
        marker: card.location_marker
      } : null
    }));

    // Remove the separate location fields since we now have the location object
    processedResults.forEach(card => {
      delete card.location_id;
      delete card.location_name;
      delete card.location_type;
      delete card.location_marker;
    });

    res.json(processedResults);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error during search' });
  }
});

// --- LOCATION MANAGEMENT ROUTES ---

// Get all locations for the authenticated user
app.get('/api/locations', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await query(
            'SELECT id, name, type, description, marker, notes, created_at, updated_at FROM locations WHERE user_id = $1 ORDER BY name',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching locations:', err);
        res.status(500).json({ message: 'Server error while fetching locations.' });
    }
});

// Create a new location
app.post('/api/locations', isAuthenticated, async (req, res) => {
    const { name, type, description, marker, notes } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required.' });
    }

    if (!['case', 'box', 'binder'].includes(type)) {
        return res.status(400).json({ message: 'Invalid location type.' });
    }

    const validMarkers = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    if (marker && !validMarkers.includes(marker)) {
        return res.status(400).json({ message: 'Invalid marker color.' });
    }

    try {
        const result = await query(
            'INSERT INTO locations (user_id, name, type, description, marker, notes, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, name, type, description, marker, notes, created_at, updated_at',
            [userId, name.trim(), type, description?.trim() || null, marker || 'blue', notes?.trim() || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            res.status(409).json({ message: 'A location with this name already exists.' });
        } else {
            console.error('Error creating location:', err);
            res.status(500).json({ message: 'Server error while creating location.' });
        }
    }
});

// Update a location
app.put('/api/locations/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, type, description, marker, notes } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required.' });
    }

    if (!['case', 'box', 'binder'].includes(type)) {
        return res.status(400).json({ message: 'Invalid location type.' });
    }

    const validMarkers = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    if (marker && !validMarkers.includes(marker)) {
        return res.status(400).json({ message: 'Invalid marker color.' });
    }

    try {
        const result = await query(
            'UPDATE locations SET name = $1, type = $2, description = $3, marker = $4, notes = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING id, name, type, description, marker, notes, created_at, updated_at',
            [name.trim(), type, description?.trim() || null, marker || 'blue', notes?.trim() || null, id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Location not found or you do not have permission to edit it.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            res.status(409).json({ message: 'A location with this name already exists.' });
        } else {
            console.error('Error updating location:', err);
            res.status(500).json({ message: 'Server error while updating location.' });
        }
    }
});

// Delete a location
app.delete('/api/locations/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        await query('BEGIN');

        // First check if the location exists and belongs to the user
        const locationCheck = await query(
            'SELECT id, name FROM locations WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (locationCheck.rowCount === 0) {
            await query('ROLLBACK');
            return res.status(404).json({ message: 'Location not found or you do not have permission to delete it.' });
        }

        // Remove location from any cards that reference it
        await query(
            'UPDATE owned_cards SET location_id = NULL WHERE location_id = $1',
            [id]
        );

        // Delete the location
        const result = await query(
            'DELETE FROM locations WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        await query('COMMIT');

        res.json({
            message: 'Location deleted successfully.',
            deletedLocation: locationCheck.rows[0]
        });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Error deleting location:', err);
        res.status(500).json({ message: 'Server error while deleting location.' });
    }
});

// Update card location
app.put('/api/collection/location', isAuthenticated, async (req, res) => {
    const { cardId, locationId } = req.body;
    const userId = req.user.id;

    if (!cardId) {
        return res.status(400).json({ message: 'Card ID is required.' });
    }

    try {
        await query('BEGIN');

        // If locationId is provided, verify it exists and belongs to the user
        if (locationId) {
            const locationCheck = await query(
                'SELECT id FROM locations WHERE id = $1 AND user_id = $2',
                [locationId, userId]
            );

            if (locationCheck.rowCount === 0) {
                await query('ROLLBACK');
                return res.status(404).json({ message: 'Location not found or you do not have permission to use it.' });
            }
        }

        // Update all owned cards for this card and user
        const result = await query(
            'UPDATE owned_cards SET location_id = $1 WHERE card_id = $2 AND user_id = $3 AND is_proxy = false',
            [locationId || null, cardId, userId]
        );

        await query('COMMIT');

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No owned cards found for this card.' });
        }

        res.json({
            message: 'Card location updated successfully.',
            updatedCards: result.rowCount
        });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Error updating card location:', err);
        res.status(500).json({ message: 'Server error while updating card location.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
