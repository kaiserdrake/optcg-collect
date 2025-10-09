import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { query, pool, withTransaction } from './db.js';
import { isAuthenticated, isAdmin } from './auth.js';
import crypto from 'crypto';
import { exec } from 'child_process';
import { validateSearchKeyword } from './validation.js';

dotenv.config();

const app = express();
const port = 3001;

// Debug middleware to log all requests
// app.use((req, res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
//   console.log(`[${timestamp}] Headers:`, {
//     'content-type': req.headers['content-type'],
//     'user-agent': req.headers['user-agent']?.substring(0, 50),
//     'referer': req.headers['referer'],
//     'origin': req.headers['origin']
//   });
//
//   // Log request completion
//   res.on('finish', () => {
//     console.log(`[${timestamp}] Response: ${res.statusCode} for ${req.method} ${req.url}`);
//   });
//
//   next();
// });
//
// Improved CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:8086',
    'http://127.0.0.1:8086',
    'http://opcc-frontend:8086',
    'http://1pc.laeradsphere.com'
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

// Generate a random short code
const generateShortCode = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 character code
};

// Create a short URL
app.post('/api/short-url', async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl || typeof originalUrl !== 'string') {
    return res.status(400).json({ message: 'Original URL is required' });
  }

  // Validate that it's a reasonable URL length
  if (originalUrl.length > 2000) {
    return res.status(400).json({ message: 'URL is too long' });
  }

  // Basic URL validation - should start with http/https or be a relative URL
  if (!originalUrl.startsWith('http://') &&
    !originalUrl.startsWith('https://') &&
    !originalUrl.startsWith('/')) {
    return res.status(400).json({ message: 'Invalid URL format' });
  }

  try {
    let shortCode;
    let attempts = 0;

    const maxAttempts = 10;

    // Try to generate a unique short code
    while (attempts < maxAttempts) {
      shortCode = generateShortCode();

      // Check if this code already exists
      const existingResult = await query(
        'SELECT id FROM short_urls WHERE short_code = $1',
        [shortCode]
      );

      if (existingResult.rows.length === 0) {
        break; // Found a unique code
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ message: 'Failed to generate unique short code' });
    }

    // Get client IP and user agent for basic analytics
    const clientIp = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;

    // Insert the short URL
    const result = await query(
      `INSERT INTO short_urls (short_code, original_url, created_by_ip, user_agent)
      VALUES ($1, $2, $3, $4)
      RETURNING id, short_code, created_at`,
      [shortCode, originalUrl, clientIp, userAgent]
    );

    const shortUrl = result.rows[0];

    res.status(201).json({
      shortCode: shortUrl.short_code,
      shortUrl: `${req.protocol}://${req.get('host')}/s/${shortUrl.short_code}`,
      originalUrl: originalUrl,
      createdAt: shortUrl.created_at
    });

  } catch (err) {
    console.error('Error creating short URL:', err);
    res.status(500).json({ message: 'Server error while creating short URL' });
  }
});

// Resolve a short URL and redirect
app.get('/s/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  if (!shortCode || !/^[a-f0-9]{8}$/.test(shortCode)) {
    return res.status(404).json({ message: 'Invalid short code format' });
  }

  try {
    // Find the short URL and increment access count
    const result = await query(
      `UPDATE short_urls
        SET access_count = access_count + 1
        WHERE short_code = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING original_url, access_count`,

      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Short URL not found or expired' });
    }

    const { original_url } = result.rows[0];

    // Redirect to the original URL
    res.redirect(302, original_url);

  } catch (err) {
    console.error('Error resolving short URL:', err);
    res.status(500).json({ message: 'Server error while resolving short URL' });
  }
});

// Get short URL statistics (optional - for future use)
app.get('/api/short-url/:shortCode/stats', async (req, res) => {
  const { shortCode } = req.params;

  if (!shortCode || !/^[a-f0-9]{8}$/.test(shortCode)) {
    return res.status(404).json({ message: 'Invalid short code format' });
  }

  try {
    const result = await query(
      `SELECT short_code, original_url, created_at, access_count, expires_at
        FROM short_urls
        WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Short URL not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error getting short URL stats:', err);
    res.status(500).json({ message: 'Server error while getting stats' });
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
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    // Include alias in both token payload and response
    const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name, alias: user.alias };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '72h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 72 * 60 * 60 * 1000,
    });
    // Include alias in the response
    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        alias: user.alias
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server error during login." });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logout successful." });
});

app.post('/api/decks/:id/publish', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await query('BEGIN');

    // First, check if deck exists and belongs to user
    const deckCheck = await query(`
      SELECT d.id, d.name, u.alias
      FROM decks d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (deckCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Deck not found or access denied.' });
    }

    const deck = deckCheck.rows[0];
    const publisher = deck.alias || 'Anonymous';

    // Get deck cards with their details - use card ID instead of card_code
    const cardsResult = await query(`
      SELECT
        dc.count,
        c.id as card_id,
        c.card_code,
        c.category
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = $1
      ORDER BY
        CASE WHEN c.category = 'LEADER' THEN 0 ELSE 1 END,
        c.id ASC
    `, [id]);

    if (cardsResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot publish empty deck.' });
    }

    // Count cards by card ID (not card_code) to preserve variants
    const cardIdCounts = {};
    cardsResult.rows.forEach(row => {
      const cardId = row.card_id;
      if (!cardIdCounts[cardId]) {
        cardIdCounts[cardId] = { count: 0, isLeader: row.category === 'LEADER' };
      }
      cardIdCounts[cardId].count += row.count;
    });

    // Build deck content string using card IDs
    const deckContentParts = [];

    // Add leader first
    const leaderEntry = Object.entries(cardIdCounts).find(([id, data]) => data.isLeader);
    if (leaderEntry) {
      const [cardId, data] = leaderEntry;
      deckContentParts.push(`${data.count}x${cardId}`);
      // Remove from cardIdCounts so it's not duplicated
      delete cardIdCounts[cardId];
    }

    // Add other cards sorted by card ID
    Object.keys(cardIdCounts)
      .sort()
      .forEach(cardId => {
        deckContentParts.push(`${cardIdCounts[cardId].count}x${cardId}`);
      });

    // Join with commas as specified
    const deckContent = deckContentParts.join(',');

    // Check if deck content exceeds VARCHAR(712) limit
    if (deckContent.length > 712) {
      await query('ROLLBACK');
      return res.status(400).json({
        message: 'Deck content is too large to publish.',
        contentLength: deckContent.length,
        maxLength: 712
      });
    }

    // Insert into public_shared_decks
    const publishResult = await query(`
      INSERT INTO public_shared_decks (deck_title, deck_content, publisher)
      VALUES ($1, $2, $3)
      RETURNING id, date_published
    `, [deck.name, deckContent, publisher]);

    await query('COMMIT');

    res.json({
      message: 'Deck published successfully!',
      published_deck: {
        id: publishResult.rows[0].id,
        deck_title: deck.name,
        publisher: publisher,
        date_published: publishResult.rows[0].date_published,
        deck_content: deckContent
      }
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Error publishing deck:', err);
    res.status(500).json({ message: 'Server error while publishing deck.' });
  }
});

// Publish deck from current state (without requiring saved deck)
app.post('/api/decks/publish-current', isAuthenticated, async (req, res) => {
  const { deckData } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!deckData || !deckData.name || !deckData.cards || !Array.isArray(deckData.cards)) {
    return res.status(400).json({ message: 'Invalid deck data provided.' });
  }

  if (deckData.cards.length === 0) {
    return res.status(400).json({ message: 'Cannot publish empty deck.' });
  }

  try {
    await query('BEGIN');

    // Get user alias for publisher name
    const userResult = await query('SELECT alias FROM users WHERE id = $1', [userId]);
    const publisher = userResult.rows[0]?.alias || 'Anonymous';

    // Process deck cards to create deck content string using card IDs
    const cardIdCounts = {};

    for (const item of deckData.cards) {
      if (!item.card || !item.card.id || !item.count) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid card data in deck.' });
      }

      const cardId = item.card.id; // Use card ID instead of card_code
      const count = item.count;
      const isLeader = item.card.category === 'LEADER';

      if (!cardIdCounts[cardId]) {
        cardIdCounts[cardId] = { count: 0, isLeader };
      }
      cardIdCounts[cardId].count += count;
    }

    // Validate that deck has a leader
    const hasLeader = Object.values(cardIdCounts).some(data => data.isLeader);
    if (!hasLeader) {
      await query('ROLLBACK');
      return res.status(400).json({ message: 'Deck must have a leader to be published.' });
    }

    // Build deck content string according to spec using card IDs
    const deckContentParts = [];

    // Add leader first
    const leaderEntry = Object.entries(cardIdCounts).find(([id, data]) => data.isLeader);
    if (leaderEntry) {
      const [cardId, data] = leaderEntry;
      deckContentParts.push(`${data.count}x${cardId}`);
      // Remove from cardIdCounts so it's not duplicated
      delete cardIdCounts[cardId];
    }

    // Add other cards sorted by card ID
    Object.keys(cardIdCounts)
      .sort()
      .forEach(cardId => {
        deckContentParts.push(`${cardIdCounts[cardId].count}x${cardId}`);
      });

    // Join with commas as specified
    const deckContent = deckContentParts.join(',');

    // Check if deck content exceeds VARCHAR(712) limit
    if (deckContent.length > 712) {
      await query('ROLLBACK');
      return res.status(400).json({
        message: 'Deck content is too large to publish.',
        contentLength: deckContent.length,
        maxLength: 712
      });
    }

    // Insert into public_shared_decks
    const publishResult = await query(`
      INSERT INTO public_shared_decks (deck_title, deck_content, publisher)
      VALUES ($1, $2, $3)
      RETURNING id, date_published
    `, [deckData.name, deckContent, publisher]);

    await query('COMMIT');

    res.json({
      message: 'Deck published successfully!',
      published_deck: {
        id: publishResult.rows[0].id,
        deck_title: deckData.name,
        publisher: publisher,
        date_published: publishResult.rows[0].date_published,
        deck_content: deckContent
      }
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Error publishing deck from current state:', err);
    res.status(500).json({ message: 'Server error while publishing deck.' });
  }
});

// Delete a published deck (admin or publisher only)
app.delete('/api/public/decks/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await query('BEGIN');

    // Get user info
    const userResult = await query('SELECT alias, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0];
    const userAlias = user.alias;
    const userRole = user.role;

    // Check if deck exists and get publisher info
    const deckCheck = await query(
      'SELECT id, deck_title, publisher FROM public_shared_decks WHERE id = $1',
      [id]
    );

    if (deckCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Published deck not found.' });
    }

    const deck = deckCheck.rows[0];

    // Check if user has permission to delete (is publisher or admin)
    if (deck.publisher !== userAlias && userRole !== 'Admin') {
      await query('ROLLBACK');
      return res.status(403).json({
        message: 'Access denied. You can only delete your own published decks.'
      });
    }


    // Delete the published deck
    await query('DELETE FROM public_shared_decks WHERE id = $1', [id]);

    await query('COMMIT');

    res.json({
      message: 'Published deck deleted successfully.',
      deletedDeck: {
        id: parseInt(id),
        deck_title: deck.deck_title,
        publisher: deck.publisher

      }
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error deleting published deck:', err);
    res.status(500).json({ message: 'Server error while deleting published deck.' });
  }
});

app.get('/api/users/me', isAuthenticated, async (req, res) => {
  try {
    // Fetch fresh user data from database including alias
    const userResult = await query('SELECT id, name, email, alias, role FROM users WHERE id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0];
    res.json(user);
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ message: 'Server error while fetching user data.' });
  }
});

app.put('/api/users/change-password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }
  try {
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
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

app.put('/api/users/me/alias', isAuthenticated, async (req, res) => {
  const { alias } = req.body;
  const userId = req.user.id;

  if (!alias || !alias.trim()) {
    return res.status(400).json({ message: 'Alias is required.' });
  }

  // Prevent changing alias of the default admin (ID = 1)
  if (userId === 1) {
    return res.status(400).json({ message: "Cannot change alias of the default admin account." });
  }

  // Validate alias length
  if (alias.trim().length > 255) {
    return res.status(400).json({ message: 'Alias must be 255 characters or less.' });
  }

  try {
    // Update the user's own alias
    await query('UPDATE users SET alias = $1 WHERE id = $2', [alias.trim(), userId]);

    res.json({ message: 'Alias updated successfully.' });
  } catch (err) {
    console.error('Error updating personal alias:', err);
    res.status(500).json({ message: 'Server error while updating alias.' });
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
    const result = await query('SELECT id, name, email, alias, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', isAuthenticated, isAdmin, async (req, res) => {
  const { email, name, role } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ message: 'Email, name, and role are required.' });
  }
  try {
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(generatedPassword, salt);

    // First insert the user without alias to get the ID
    const result = await query(
      'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email, name, role, passwordHash]
    );

    const newUser = result.rows[0];
    const defaultAlias = `User${newUser.id.toString().padStart(3, '0')}`;

    // Update the user with the default alias
    await query(
      'UPDATE users SET alias = $1 WHERE id = $2',
      [defaultAlias, newUser.id]
    );

    // Return the user data with the alias included
    res.status(201).json({
      user: {
        ...newUser,
        alias: defaultAlias
      },
      generatedPassword
    });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ message: 'User with this email or name already exists.' });
    } else {
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
});

app.put('/api/users/:id/password', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const adminUserId = req.user.id;
  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required.' });
  }
  const userIdToUpdate = parseInt(id, 10);
  if (userIdToUpdate === adminUserId) {
    return res.status(400).json({ message: "Admin cannot change their own password from this page. Use 'Change Password' instead." });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userIdToUpdate]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id;
  const userIdToDelete = parseInt(id, 10);
  if (userIdToDelete === 1) {
    return res.status(400).json({ message: "Cannot delete the primary admin account." });
  }
  if (userIdToDelete === adminUserId) {
    return res.status(400).json({ message: "Admin cannot delete their own account." });
  }
  try {
    const result = await query('DELETE FROM users WHERE id = $1', [userIdToDelete]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'User and all their owned cards deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/users/:id/alias', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { alias } = req.body;
  const adminUserId = req.user.id;

  if (!alias || !alias.trim()) {
    return res.status(400).json({ message: 'Alias is required.' });
  }

  const userIdToUpdate = parseInt(id, 10);

  // Prevent changing alias of the default admin (ID = 1)
  if (userIdToUpdate === 1) {
    return res.status(400).json({ message: "Cannot change alias of the default admin account." });
  }

  // Validate alias length
  if (alias.trim().length > 255) {
    return res.status(400).json({ message: 'Alias must be 255 characters or less.' });
  }

  try {
    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [userIdToUpdate]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update the alias
    await query('UPDATE users SET alias = $1 WHERE id = $2', [alias.trim(), userIdToUpdate]);

    res.json({ message: 'Alias updated successfully.' });
  } catch (err) {
    console.error('Error updating alias:', err);
    res.status(500).json({ message: 'Server error while updating alias.' });
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
  if (!card_id || !type || !action) {
    return res.status(400).json({ message: 'card_id, type, and action are required.' });
  }
  const is_proxy = type === 'proxy';
  try {
    await query('BEGIN');
    const countResult = await query('SELECT COUNT(*) FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = $3', [userId, card_id, is_proxy]);
    const currentCount = parseInt(countResult.rows[0].count, 10);
    if (action === 'increment') {
      if (currentCount >= 99) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot own more than 99 copies.' });
      }
      await query('INSERT INTO owned_cards (user_id, card_id, is_proxy) VALUES ($1, $2, $3)', [userId, card_id, is_proxy]);
    } else if (action === 'decrement') {
      if (currentCount <= 0) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Count cannot be less than zero.' });
      }
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


app.put('/api/collection/set-count', isAuthenticated, async (req, res) => {
  const { cardId, ownedCount, proxyCount } = req.body;
  const userId = req.user.id;

  if (!cardId) {
    return res.status(400).json({ message: 'Card ID is required.' });
  }

  // Validate counts
  if (ownedCount !== undefined && (ownedCount < 0 || ownedCount > 99)) {
    return res.status(400).json({ message: 'Owned count must be between 0 and 99.' });
  }

  if (proxyCount !== undefined && (proxyCount < 0 || proxyCount > 99)) {
    return res.status(400).json({ message: 'Proxy count must be between 0 and 99.' });
  }

  try {
    await query('BEGIN');

    // Handle owned count if provided
    if (ownedCount !== undefined) {
      // Get current owned count
      const currentOwnedResult = await query(
        'SELECT COUNT(*) FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = false',
        [userId, cardId] // cardId is already a string (card code)
      );
      const currentOwnedCount = parseInt(currentOwnedResult.rows[0].count, 10);

      if (ownedCount > currentOwnedCount) {
        // Add more owned cards
        const toAdd = ownedCount - currentOwnedCount;
        for (let i = 0; i < toAdd; i++) {
          await query(
            'INSERT INTO owned_cards (user_id, card_id, is_proxy) VALUES ($1, $2, false)',
            [userId, cardId]
          );
        }
      } else if (ownedCount < currentOwnedCount) {
        // Remove owned cards
        const toRemove = currentOwnedCount - ownedCount;
        await query(`
          DELETE FROM owned_cards
          WHERE instance_id IN (
            SELECT instance_id
            FROM owned_cards
            WHERE user_id = $1 AND card_id = $2 AND is_proxy = false
            LIMIT $3
          )
        `, [userId, cardId, toRemove]);
      }
    }

    // Handle proxy count if provided
    if (proxyCount !== undefined) {
      // Get current proxy count
      const currentProxyResult = await query(
        'SELECT COUNT(*) FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = true',
        [userId, cardId] // cardId is already a string (card code)
      );
      const currentProxyCount = parseInt(currentProxyResult.rows[0].count, 10);

      if (proxyCount > currentProxyCount) {
        // Add more proxy cards
        const toAdd = proxyCount - currentProxyCount;
        for (let i = 0; i < toAdd; i++) {
          await query(
            'INSERT INTO owned_cards (user_id, card_id, is_proxy) VALUES ($1, $2, true)',
            [userId, cardId]
          );
        }
      } else if (proxyCount < currentProxyCount) {
        // Remove proxy cards
        const toRemove = currentProxyCount - proxyCount;
        await query(`
          DELETE FROM owned_cards
          WHERE instance_id IN (
            SELECT instance_id
            FROM owned_cards
            WHERE user_id = $1 AND card_id = $2 AND is_proxy = true
            LIMIT $3
          )
        `, [userId, cardId, toRemove]);
      }
    }

    // Get final counts to return
    const finalCountsResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count,
        COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count
      FROM owned_cards
      WHERE user_id = $1 AND card_id = $2
    `, [userId, cardId]);

    await query('COMMIT');

    res.json({
      owned_count: parseInt(finalCountsResult.rows[0].owned_count, 10),
      proxy_count: parseInt(finalCountsResult.rows[0].proxy_count, 10),
      message: 'Counts updated successfully'
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Error setting card count:', err);
    res.status(500).json({ message: 'Server error while setting card count.' });
  }
});


app.put('/api/collection/location', isAuthenticated, async (req, res) => {
  const { cardId, locationId } = req.body;
  const userId = req.user.id;

  if (!cardId) {
    return res.status(400).json({ message: 'Card ID is required.' });
  }

  try {
    await query('BEGIN');

    if (locationId) {
      const numericLocationId = parseInt(locationId);
      if (isNaN(numericLocationId)) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Location ID must be a valid number.' });
      }

      const locationCheck = await query('SELECT id FROM locations WHERE id = $1 AND user_id = $2', [numericLocationId, userId]);
      if (locationCheck.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ message: 'Location not found or does not belong to user.' });
      }
    }

    const updateResult = await query(
      'UPDATE owned_cards SET location_id = $1 WHERE user_id = $2 AND card_id = $3',
      [locationId || null, userId, cardId]
    );

    if (updateResult.rowCount === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'No owned cards found to update location for.' });
    }

    await query('COMMIT');

    res.json({
      message: 'Location updated successfully.',
      updatedCards: updateResult.rowCount
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Location update error:', err);
    res.status(500).json({ message: 'Server error while updating location.' });
  }
});

// Public card search endpoint (for non-authenticated users - limited data)
app.get('/api/public/cards/search', validateSearchKeyword, async (req, res) => {
  const { keyword, limit = 50, offset = 0 } = req.query;

  if (!keyword || keyword.trim() === '') {
    return res.status(400).json({ error: 'Search keyword is required for public search' });
  }

  try {
    // Simple query for public access - only basic card info, no collection data
    let baseQuery = `
      SELECT
        c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter,
        c.effect, c.trigger_effect, c.img_url, c.attributes, c.types,
        c.block, c.rarity, c.cost,
        STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as packs
      FROM cards c
      LEFT JOIN card_pack_appearances cpa ON c.id = cpa.card_id
      LEFT JOIN packs p ON cpa.pack_code = p.code
    `;

    const params = [];
    let paramIndex = 1;
    const whereClauses = [];

    // Parse advanced search keywords (including tag: for consistency, though not functional for public search)
    const idMatch = keyword.match(/id:(\S+)/);
    const exactMatch = keyword.match(/exact:"([^"]+)"/);
    const categoryMatch = keyword.match(/category:(\w+)/i);
    const colorMatch = keyword.match(/color:(\w+)/i);
    const costMatch = keyword.match(/cost:(\d+)/i);
    const tagMatch = keyword.match(/tag:(\w+)/i); // Parse but ignore for public search

    // Remove advanced keywords to get fuzzy text
    let fuzzyText = keyword
      .replace(/id:\S+/g, '')
      .replace(/exact:"[^"]+"/g, '')
      .replace(/exact:\S+/g, '')
      .replace(/category:\w+/g, '')
      .replace(/color:\w+/g, '')
      .replace(/cost:\S+/g, '')
      .replace(/tag:\w+/g, '') // Remove tag keywords
      .trim();

    // Basic fuzzy search
    if (fuzzyText && fuzzyText.length > 0) {
      whereClauses.push(`(
        c.name ILIKE '%' || ${paramIndex} || '%' OR
        array_to_string(c.attributes, ' ') ILIKE '%' || ${paramIndex} || '%' OR
        array_to_string(c.types, ' ') ILIKE '%' || ${paramIndex} || '%'
      )`);
      params.push(fuzzyText);
      paramIndex++;
    }

    // Advanced filters (where applicable for public search)
    if (idMatch) {
      whereClauses.push(`(c.id ILIKE '%' || ${paramIndex} || '%' OR c.card_code ILIKE '%' || ${paramIndex} || '%')`);
      params.push(idMatch[1]);
      paramIndex++;
    }

    if (exactMatch) {
      const exactValue = exactMatch[1];
      whereClauses.push(`(
        c.name ILIKE '%' || ${paramIndex} || '%' OR
        c.effect ILIKE '%' || ${paramIndex} || '%' OR
        c.trigger_effect ILIKE '%' || ${paramIndex} || '%' OR
        array_to_string(c.attributes, ' ') ILIKE '%' || ${paramIndex} || '%' OR
        array_to_string(c.types, ' ') ILIKE '%' || ${paramIndex} || '%'
      )`);
      params.push(exactValue);
      paramIndex++;
    }

    if (categoryMatch) {
      whereClauses.push(`c.category ILIKE ${paramIndex}`);
      params.push(`%${categoryMatch[1].toUpperCase()}%`);
      paramIndex++;
    }

    if (colorMatch) {
      whereClauses.push(`c.color ILIKE ${paramIndex}`);
      params.push(`%${colorMatch[1]}%`);
      paramIndex++;
    }

    if (costMatch) {
      const cost = parseInt(costMatch[1]);
      if (!isNaN(cost)) {
        whereClauses.push(`c.cost = ${paramIndex}`);
        params.push(cost);
        paramIndex++;
      }
    }

    // Note: tag: filter is parsed but ignored for public search since no tag data is available

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ` GROUP BY
      c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter,
      c.effect, c.trigger_effect, c.img_url, c.attributes, c.types,
      c.block, c.rarity, c.cost
    `;

    // Add ordering
    const orderClauses = [];

    if (fuzzyText && fuzzyText.length > 0) {
      orderClauses.push(`CASE WHEN c.name ILIKE '%' || ${params.indexOf(fuzzyText) + 1} || '%' THEN 0 ELSE 1 END`);
    }

    if (idMatch) {
      const idValue = idMatch[1];
      const idParamIndex = params.indexOf(idValue);
      if (idParamIndex !== -1) {
        orderClauses.push(`CASE
          WHEN c.id = ${idParamIndex + 1} THEN 0
          WHEN c.card_code = ${idParamIndex + 1} THEN 1
          WHEN c.id ILIKE ${idParamIndex + 1} || '%' THEN 2
          WHEN c.card_code ILIKE ${idParamIndex + 1} || '%' THEN 3
          ELSE 4 END`);
      }
    }

    orderClauses.push('c.name ASC');

    if (orderClauses.length > 0) {
      baseQuery += ' ORDER BY ' + orderClauses.join(', ');
    }

    baseQuery += ` LIMIT ${paramIndex} OFFSET ${paramIndex + 1};`;
    params.push(limit, offset);

    const result = await query(baseQuery, params);
    res.json(result.rows);

  } catch (err) {
    console.error('Public search error:', err);
    res.status(500).json({ message: 'Server error while searching cards.' });
  }
});

// Enhanced search
app.get('/api/cards/search', isAuthenticated, validateSearchKeyword, async (req, res) => {
  const {
    keyword,
    ownedOnly,
    showProxies,
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;
  const userId = req.user.id;

  // Convert limit and offset to integers
  const limitInt = Math.min(parseInt(limit) || 50, 100); // Cap at 100 per page
  const offsetInt = parseInt(offset) || 0;

  // Validate sort parameters
  const validSortFields = ['name', 'rarity', 'card_code', 'tags', 'cost', 'power'];
  const validSortOrders = ['asc', 'desc'];

  const sortByField = validSortFields.includes(sortBy) ? sortBy : 'name';
  const sortOrderDir = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc';

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
    const criteria = { id: null, pack: null, colors: [], exact: null, location: null, category: null, cost: null, tags: [] };
    const regex = /(\w+):("([^"]+)"|(\S+))/g;
    let match;
    while ((match = regex.exec(sanitizedKeyword)) !== null) {
      const key = match[1].toLowerCase();
      const value = (match[3] || match[4]).trim();
      if (key === 'id' && value.length > 0) criteria.id = value;
      if (key === 'pack' && value.length > 0) criteria.pack = value;
      if (key === 'color' && value.length > 0) criteria.colors.push(value);
      if (key === 'exact' && value.length > 0) criteria.exact = value;
      if (key === 'location' && value.length > 0) criteria.location = value;
      if (key === 'category' && value.length > 0) criteria.category = value;
      if (key === 'cost' && value.length > 0) criteria.cost = value;
      if (key === 'tag' && value.length > 0) criteria.tags.push(value);
    }

    fuzzyText = sanitizedKeyword.replace(regex, '').trim();

    // Check if we have special criteria (advance keywords)
    const hasSpecialCriteria = criteria.id || criteria.pack || criteria.colors.length > 0 ||
      criteria.exact || criteria.location || criteria.category || criteria.cost || criteria.tags.length > 0;

    // Validate fuzzy text based on conditions
    let fuzzyTextValid = false;

    if (allowEmptyKeyword) {
      fuzzyTextValid = true;
    } else if (hasSpecialCriteria) {
      fuzzyTextValid = true;
    } else {
      fuzzyTextValid = fuzzyText && fuzzyText.length >= 3;
    }

    const hasValidCriteria = fuzzyTextValid || hasSpecialCriteria;

    if (!hasValidCriteria) {
      if (fuzzyText && fuzzyText.length > 0 && fuzzyText.length < 3) {
        return res.status(400).json({
          error: 'Search term must be at least 3 characters long.'
        });
      } else {
        return res.status(400).json({
          error: 'Please enter a search term or use the "In Collection" filter.'
        });
      }
    }

    // Build the base query (same logic as before, but we'll modify the end)
    let baseQuery = `
      SELECT
        c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter,
        c.effect, c.trigger_effect, c.img_url, c.attributes, c.types,
        c.block, c.rarity, c.cost,
        STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as packs,
        COALESCE(oc.owned_count, 0) as owned_count,
        COALESCE(oc.proxy_count, 0) as proxy_count,
        ARRAY_AGG(DISTINCT ut.tag_type) FILTER (WHERE ut.tag_type IS NOT NULL) as user_tags,
        ARRAY_AGG(DISTINCT gt.tag_type) FILTER (WHERE gt.tag_type IS NOT NULL) as global_tags,
        l.name as location_name,
        l.id as location_id
      FROM cards c
      LEFT JOIN card_pack_appearances cpa ON c.id = cpa.card_id
      LEFT JOIN packs p ON cpa.pack_code = p.code
      LEFT JOIN (
        SELECT
          card_id,
          COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count,
          COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count,
          MAX(location_id) as location_id
        FROM owned_cards
        WHERE user_id = $1
        GROUP BY card_id
      ) oc ON c.id = oc.card_id
      LEFT JOIN card_tags ut ON c.id = ut.card_id AND ut.user_id = $1 AND ut.is_global = false
      LEFT JOIN card_tags gt ON c.id = gt.card_id AND gt.is_global = true
      LEFT JOIN locations l ON oc.location_id = l.id
    `;

    let params = [userId];
    let paramIndex = 2;
    let whereClauses = [];


    // Consider proxy cards when showProxies is true
    if (ownedOnly === 'true') {
      if (showProxies === 'true') {
        // When Show Proxies is enabled, include both owned and proxy cards
        whereClauses.push(`(oc.owned_count > 0 OR oc.proxy_count > 0)`);
      } else {
        // When Show Proxies is disabled, only include owned cards
        whereClauses.push(`oc.owned_count > 0`);
      }
    }

    // Add criteria-based where clauses
    if (criteria.id) {
      whereClauses.push(`(c.id = $${paramIndex} OR c.card_code = $${paramIndex} OR c.id ILIKE $${paramIndex} || '%' OR c.card_code ILIKE $${paramIndex} || '%')`);
      params.push(criteria.id);
      paramIndex++;
    }

    if (criteria.exact) {
      whereClauses.push(`c.name ILIKE '%' || $${paramIndex} || '%'`);
      params.push(criteria.exact);
      paramIndex++;
    }

    if (criteria.category) {
      whereClauses.push(`c.category ILIKE $${paramIndex}`);
      params.push(criteria.category);
      paramIndex++;
    }

    if (criteria.cost) {
      const cost = parseInt(criteria.cost);
      if (!isNaN(cost)) {
        whereClauses.push(`c.cost = $${paramIndex}`);
        params.push(cost);
        paramIndex++;
      }
    }

    if (criteria.location) {
      whereClauses.push(`l.name ILIKE '%' || $${paramIndex} || '%'`);
      params.push(criteria.location);
      paramIndex++;
    }

    // Add pack filter
    if (criteria.pack) {
      whereClauses.push(`(p.code ILIKE '%' || $${paramIndex} || '%' OR p.series_id ILIKE '%' || $${paramIndex} || '%' OR p.name ILIKE '%' || $${paramIndex} || '%')`);
      params.push(criteria.pack);
      paramIndex++;
    }

    // Add color filters - multiple colors use OR logic (same tag type)
    if (criteria.colors && criteria.colors.length > 0) {
      const colorConditions = criteria.colors.map(color => {
        const condition = `c.color ILIKE '%' || $${paramIndex} || '%'`;
        params.push(color);
        paramIndex++;
        return condition;
      });
      whereClauses.push(`(${colorConditions.join(' OR ')})`);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const tagConditions = criteria.tags.map(tag => {
        const condition = `(ut.tag_type = $${paramIndex} OR gt.tag_type = $${paramIndex})`;
        params.push(tag);
        paramIndex++;
        return condition;
      });
      whereClauses.push(`(${tagConditions.join(' OR ')})`);
    }

    if (fuzzyText && fuzzyText.length > 0) {
      whereClauses.push(`(
        c.name ILIKE '%' || $${paramIndex} || '%' OR
        c.effect ILIKE '%' || $${paramIndex} || '%' OR
        c.trigger_effect ILIKE '%' || $${paramIndex} || '%' OR
        c.id ILIKE '%' || $${paramIndex} || '%' OR
        c.card_code ILIKE '%' || $${paramIndex} || '%'
      )`);
      params.push(fuzzyText);
      paramIndex++;
    }

    // Build count query for total results (remove SELECT fields, GROUP BY, ORDER BY, LIMIT)
    let countQuery = `
      SELECT COUNT(DISTINCT c.id)
      FROM cards c
      LEFT JOIN card_pack_appearances cpa ON c.id = cpa.card_id
      LEFT JOIN packs p ON cpa.pack_code = p.code
      LEFT JOIN (
        SELECT
          card_id,
          COUNT(*) FILTER (WHERE is_proxy = false) AS owned_count,
          COUNT(*) FILTER (WHERE is_proxy = true) AS proxy_count,
          MAX(location_id) as location_id
        FROM owned_cards
        WHERE user_id = $1
        GROUP BY card_id
      ) oc ON c.id = oc.card_id
      LEFT JOIN card_tags ut ON c.id = ut.card_id AND ut.user_id = $1 AND ut.is_global = false
      LEFT JOIN card_tags gt ON c.id = gt.card_id AND gt.is_global = true
      LEFT JOIN locations l ON oc.location_id = l.id
    `;

    if (whereClauses.length > 0) {
      const whereClause = ' WHERE ' + whereClauses.join(' AND ');
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // Execute count query first
    const totalCountResult = await query(countQuery, params);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    // Add GROUP BY, ORDER BY, and pagination to main query
    baseQuery += `
      GROUP BY
        c.id, c.name, c.card_code, c.category, c.color, c.power, c.counter,
        c.effect, c.trigger_effect, c.img_url, c.attributes, c.types,
        c.block, c.rarity, c.cost, oc.owned_count, oc.proxy_count,
        l.name, l.id
    `;

    // Add ordering
    const orderClauses = [];

    if (fuzzyText && fuzzyText.length > 0) {
      orderClauses.push(`CASE WHEN c.name ILIKE '%' || $${params.indexOf(fuzzyText) + 1} || '%' THEN 0 ELSE 1 END`);
    }

    if (criteria.id) {
      const idValue = criteria.id;
      const idParamIndex = params.indexOf(idValue);
      if (idParamIndex !== -1) {
        orderClauses.push(`CASE
          WHEN c.id = $${idParamIndex + 1} THEN 0
          WHEN c.card_code = $${idParamIndex + 1} THEN 1
          WHEN c.id ILIKE $${idParamIndex + 1} || '%' THEN 2
          WHEN c.card_code ILIKE $${idParamIndex + 1} || '%' THEN 3
          ELSE 4 END`);
      }
    }

    // Add user-selected sorting
    switch (sortByField) {
      case 'rarity':
        // Define rarity order in SQL
        orderClauses.push(`
          CASE c.rarity
          WHEN 'C' THEN 1
          WHEN 'UC' THEN 2
          WHEN 'R' THEN 3
          WHEN 'SR' THEN 4
          WHEN 'SEC' THEN 5
          WHEN 'L' THEN 6
          WHEN 'SP' THEN 7
          ELSE 0
          END ${sortOrderDir.toUpperCase()}
        `);
        orderClauses.push('c.name ASC'); // Secondary sort by name
        break;

      case 'card_code':
        orderClauses.push(`c.card_code ${sortOrderDir.toUpperCase()}`);
        orderClauses.push('c.name ASC'); // Secondary sort by name
        break;

      case 'tags':
        // Count total tags (user_tags + global_tags)
        orderClauses.push(`
          (COALESCE(array_length(ARRAY_AGG(DISTINCT ut.tag_type) FILTER (WHERE ut.tag_type IS NOT NULL), 1), 0) +
          COALESCE(array_length(ARRAY_AGG(DISTINCT gt.tag_type) FILTER (WHERE gt.tag_type IS NOT NULL), 1), 0))
${sortOrderDir.toUpperCase()}
`);
        orderClauses.push('c.name ASC'); // Secondary sort by name
        break;

      case 'cost':
        orderClauses.push(`c.cost ${sortOrderDir.toUpperCase()} NULLS LAST`);
        orderClauses.push('c.name ASC'); // Secondary sort by name
        break;

      case 'power':
        orderClauses.push(`c.power ${sortOrderDir.toUpperCase()} NULLS LAST`);
        orderClauses.push('c.name ASC'); // Secondary sort by name
        break;

      case 'name':
      default:
        orderClauses.push(`c.name ${sortOrderDir.toUpperCase()}`);
        break;
    }

    if (orderClauses.length > 0) {
      baseQuery += ' ORDER BY ' + orderClauses.join(', ');
    }

    // Add pagination
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitInt, offsetInt);

    // Execute main query
    const result = await query(baseQuery, params);

    // Return paginated response
    res.json({
      results: result.rows,
      totalCount: totalCount,
      page: Math.floor(offsetInt / limitInt) + 1,
      itemsPerPage: limitInt,
      totalPages: Math.ceil(totalCount / limitInt)
    });

  } catch (err) {
    console.error('Enhanced search error:', err);
    res.status(500).json({
      error: 'Server error while searching cards.',
      message: err.message
    });
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
      [name.trim(), type, description?.trim() || null, marker, notes?.trim() || null, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found or access denied.' });
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

    // Check if location exists and belongs to user
    const locationCheck = await query(
      'SELECT id, name FROM locations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (locationCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Location not found or access denied.' });
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


// Get all instances of a specific card for the authenticated user
app.get('/api/cards/:cardId/instances', isAuthenticated, async (req, res) => {
  const { cardId } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(`
      SELECT
        oc.instance_id,
        oc.is_proxy,
        oc.location_id,
        oc.created_at,
        l.name as location_name,
        l.marker as location_marker,
        l.type as location_type
      FROM owned_cards oc
      LEFT JOIN locations l ON oc.location_id = l.id
      WHERE oc.user_id = $1 AND oc.card_id = $2
      ORDER BY oc.is_proxy ASC, oc.instance_id ASC
    `, [userId, cardId]);

    const instances = result.rows.map(row => ({
      instance_id: row.instance_id,
      is_proxy: row.is_proxy,
      location_id: row.location_id,
      location: row.location_name ? {
        id: row.location_id,
        name: row.location_name,
        marker: row.location_marker || 'gray',
        type: row.location_type
      } : null,
      created_at: row.created_at
    }));

    res.json({
      cardId,
      instances
    });
  } catch (err) {
    console.error('Error fetching card instances:', err);
    res.status(500).json({ message: 'Server error while fetching card instances.' });
  }
});

// Update locations for multiple card instances (batch update)
app.put('/api/cards/:cardId/instances/locations', isAuthenticated, async (req, res) => {
  const { cardId } = req.params;
  const { updates } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: 'Updates array is required and must not be empty.' });
  }

  // Validate updates structure
  for (const update of updates) {
    if (!update.instance_id || typeof update.instance_id !== 'number') {
      return res.status(400).json({
        message: 'Each update must have a valid instance_id.'
      });
    }
    if (update.location_id !== null && typeof update.location_id !== 'number') {
      return res.status(400).json({
        message: 'location_id must be a number or null.'
      });
    }
  }

  try {
    await query('BEGIN');

    // Verify all instances belong to this user and card
    const instanceIds = updates.map(u => u.instance_id);
    const verifyResult = await query(`
      SELECT instance_id
      FROM owned_cards
      WHERE user_id = $1 AND card_id = $2 AND instance_id = ANY($3)
    `, [userId, cardId, instanceIds]);

    if (verifyResult.rows.length !== instanceIds.length) {
      await query('ROLLBACK');
      return res.status(403).json({
        message: 'Some instances do not belong to you or this card.'
      });
    }

    // Validate all location_ids if not null
    const locationIds = updates
      .filter(u => u.location_id !== null)
      .map(u => u.location_id);

    if (locationIds.length > 0) {
      // Remove duplicates
      const uniqueLocationIds = [...new Set(locationIds)];

      const locResult = await query(`
        SELECT id FROM locations
        WHERE user_id = $1 AND id = ANY($2)
      `, [userId, uniqueLocationIds]);

      if (locResult.rows.length !== uniqueLocationIds.length) {
        await query('ROLLBACK');
        return res.status(404).json({
          message: 'Some locations not found or do not belong to you.'
        });
      }
    }

    // Perform updates
    for (const update of updates) {
      await query(`
        UPDATE owned_cards
        SET location_id = $1
        WHERE instance_id = $2 AND user_id = $3
      `, [update.location_id || null, update.instance_id, userId]);
    }

    await query('COMMIT');

    res.json({
      message: 'Instance locations updated successfully.',
      updatedCount: updates.length
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error updating instance locations:', err);
    res.status(500).json({
      message: 'Server error while updating instance locations.'
    });
  }
});

// --- CARD TAGS ROUTES ---

// Get tags for a specific card
app.get('/api/cards/:cardId/tags', isAuthenticated, async (req, res) => {
  const { cardId } = req.params;
  const userId = req.user.id;

  try {
    // Get user tags and global tags for this card
    const result = await query(`
SELECT
tag_type,
  is_global,
  user_id,
  created_at
  FROM card_tags
  WHERE card_id = $1 AND (user_id = $2 OR is_global = true)
ORDER BY is_global DESC, tag_type
`, [cardId, userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching card tags:', err);
    res.status(500).json({ message: 'Server error while fetching tags.' });
  }
});

// Set/unset user tag (favorite, want)
app.post('/api/cards/:cardId/tags', isAuthenticated, async (req, res) => {
  const { cardId } = req.params;
  const { tagType, action } = req.body;
  const userId = req.user.id;

  if (!tagType || !action) {
    return res.status(400).json({ message: 'tagType and action are required.' });
  }

  if (!['favorite', 'want'].includes(tagType)) {
    return res.status(400).json({ message: 'Invalid tag type for user tags.' });
  }

  if (!['add', 'remove'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "add" or "remove".' });
  }

  try {
    await query('BEGIN');

    if (action === 'add') {
      // Check if the user tag already exists
      const existingTag = await query(
        'SELECT id FROM card_tags WHERE card_id = $1 AND user_id = $2 AND tag_type = $3 AND is_global = false',
        [cardId, userId, tagType]
      );

      if (existingTag.rows.length > 0) {
        // Tag already exists, just update the timestamp
        await query(
          'UPDATE card_tags SET updated_at = NOW() WHERE card_id = $1 AND user_id = $2 AND tag_type = $3 AND is_global = false',
          [cardId, userId, tagType]
        );
      } else {
        // Insert new user tag
        await query(`
INSERT INTO card_tags (card_id, user_id, tag_type, is_global, updated_at)
VALUES ($1, $2, $3, false, NOW())
`, [cardId, userId, tagType]);
      }
    } else {
      // Remove user tag
      const deleteResult = await query(`
DELETE FROM card_tags
  WHERE card_id = $1 AND user_id = $2 AND tag_type = $3 AND is_global = false
`, [cardId, userId, tagType]);

      if (deleteResult.rowCount === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ message: 'Tag not found.' });
      }
    }

    await query('COMMIT');
    res.json({ message: `Tag ${action}ed successfully.`, tagType, action });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Error managing user tag:', err);
    res.status(500).json({ message: 'Server error while managing tag.' });
  }
});

// Admin: Set/unset global tags (banned, restricted)
app.post('/api/cards/:cardId/admin-tags', isAuthenticated, isAdmin, async (req, res) => {
  const { cardId } = req.params;
  const { tagType, action } = req.body;

  if (!tagType || !action) {
    return res.status(400).json({ message: 'tagType and action are required.' });
  }

  if (!['banned', 'restricted'].includes(tagType)) {
    return res.status(400).json({ message: 'Invalid tag type for admin tags.' });
  }

  if (!['add', 'remove'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "add" or "remove".' });
  }

  try {
    await query('BEGIN');

    if (action === 'add') {
      // Check if the global tag already exists
      const existingTag = await query(
        'SELECT id FROM card_tags WHERE card_id = $1 AND tag_type = $2 AND is_global = true',
        [cardId, tagType]
      );

      if (existingTag.rows.length > 0) {
        // Tag already exists, just update the timestamp
        await query(
          'UPDATE card_tags SET updated_at = NOW() WHERE card_id = $1 AND tag_type = $2 AND is_global = true',
          [cardId, tagType]
        );
      } else {
        // Insert new global tag
        await query(`
INSERT INTO card_tags (card_id, user_id, tag_type, is_global, updated_at)
VALUES ($1, NULL, $2, true, NOW())
`, [cardId, tagType]);
      }
    } else {
      // Remove global tag
      const deleteResult = await query(`
DELETE FROM card_tags
  WHERE card_id = $1 AND tag_type = $2 AND is_global = true
`, [cardId, tagType]);

      if (deleteResult.rowCount === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ message: 'Global tag not found.' });
      }
    }

    await query('COMMIT');
    res.json({ message: `Global tag ${action}ed successfully.`, tagType, action });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Error managing global tag:', err);
    res.status(500).json({ message: 'Server error while managing global tag.' });
  }
});

// Export collection endpoint
app.get('/api/collection/export', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get all owned cards (not proxy) with their counts
    const result = await query(`
SELECT
  card_id,
    COUNT(*) as owned_count
    FROM owned_cards
  WHERE user_id = $1 AND is_proxy = false
    GROUP BY card_id
    ORDER BY card_id
`, [userId]);

    const collection = result.rows.map(row => ({
      card_id: row.card_id,
      owned_count: parseInt(row.owned_count, 10)
    }));

    res.json({
      collection,
      totalCards: collection.length,
      exportedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error exporting collection:', err);
    res.status(500).json({ message: 'Server error while exporting collection.' });
  }
});

// Import collection endpoint
app.post('/api/collection/import', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { collectionData, mode = 'override' } = req.body; // Default to 'override' for backward compatibility

  if (!collectionData || typeof collectionData !== 'string') {
    return res.status(400).json({ message: 'Collection data is required.' });
  }

  // Validate mode parameter
  if (!['override', 'append'].includes(mode)) {
    return res.status(400).json({ message: 'Import mode must be either "override" or "append".' });
  }

  // Reprint handling utility functions (same as in backend/scripts/init.js)
  const isReprint = (cardCode) => {
    if (!cardCode) return false;
    return /_r\d+$/.test(cardCode); // Only match _rN patterns, not _pN
  };

  const getBaseCardId = (cardCode) => {
    return cardCode.replace(/_r\d+$/, ''); // Only remove _rN suffixes, not _pN
  };

  const lines = collectionData.trim().split('\n').filter(line => line.trim());
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
    errorLines: []
  };

  try {
    await withTransaction(async (client) => {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        results.processed++;
        const lineNumber = lineIndex + 1;

        // Parse the format: "4 x OP10-082" or "4xOP10-082" or variations
        // Updated regex to capture any non-whitespace characters before 'x'
        const match = trimmedLine.match(/^(\S+)\s*x\s*(.+)$/i);

        if (!match) {
          results.errors++;
          const errorMsg = `Invalid format: "${trimmedLine}"`;
          results.errorDetails.push(errorMsg);
          results.errorLines.push({
            lineNumber,
            line: trimmedLine,
            error: 'Invalid format - expected "COUNT x CARD_ID"'
          });
          continue;
        }

        const countString = match[1].trim();
        let cardId = match[2].trim();

        // Parse and validate the count
        const count = parseInt(countString, 10);

        // Check if count is a valid integer and within range
        if (isNaN(count) || count < 0 || count > 99) {
          results.errors++;
          const errorMsg = `Invalid count for ${cardId}: "${countString}" (must be a number between 0-99)`;
          results.errorDetails.push(errorMsg);
          results.errorLines.push({
            lineNumber,
            line: trimmedLine,
            error: `Invalid count "${countString}" - must be a number between 0-99`
          });
          continue;
        }

        try {
          // Convert reprint cardId to baseId if needed
          let actualCardId = cardId;
          if (isReprint(cardId)) {
            actualCardId = getBaseCardId(cardId);
            console.log(`IMPORT: Converting reprint ${cardId} to base card ${actualCardId}`);
          }

          // Check if the card exists in the database using the actualCardId (baseId for reprints)
          const cardExists = await client.query('SELECT id FROM cards WHERE id = $1', [actualCardId]);
          if (cardExists.rows.length === 0) {
            results.errors++;
            const errorMsg = `Card not found: ${cardId}${actualCardId !== cardId ? ` (checked as ${actualCardId})` : ''}`;
            results.errorDetails.push(errorMsg);
            results.errorLines.push({
              lineNumber,
              line: trimmedLine,
              error: `Card "${cardId}" not found in database`
            });
            continue;
          }

          // Get current count of owned cards (non-proxy) using the actualCardId
          const currentResult = await client.query(
            'SELECT COUNT(*) FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = false',
            [userId, actualCardId]
          );
          const currentCount = parseInt(currentResult.rows[0].count, 10);

          let targetCount;
          if (mode === 'append') {
            // Append mode: add to existing count
            targetCount = currentCount + count;

            // Ensure we don't exceed the maximum of 99
            if (targetCount > 99) {
              targetCount = 99;
              // Optional: Log a warning or add to error details
              console.warn(`IMPORT: Capping ${cardId} at 99 cards (would have been ${currentCount + count})`);
            }
          } else {
            // Override mode: set exact count (existing behavior)
            targetCount = count;
          }

          if (currentCount === targetCount) {
            // No change needed
            continue;
          }

          if (targetCount === 0) {
            // Delete all owned (non-proxy) cards for this card
            await client.query(
              'DELETE FROM owned_cards WHERE user_id = $1 AND card_id = $2 AND is_proxy = false',
              [userId, actualCardId]
            );
            results.updated++;
          } else if (targetCount > currentCount) {
            // Add more cards
            const toAdd = targetCount - currentCount;
            for (let i = 0; i < toAdd; i++) {
              await client.query(
                'INSERT INTO owned_cards (user_id, card_id, is_proxy) VALUES ($1, $2, false)',
                [userId, actualCardId]
              );
            }
            results.updated++;
          } else {
            // Remove some cards (targetCount < currentCount)
            const toRemove = currentCount - targetCount;

            // Remove the specified number of cards
            await client.query(`
DELETE FROM owned_cards
WHERE instance_id IN (
SELECT instance_id
FROM owned_cards
WHERE user_id = $1 AND card_id = $2 AND is_proxy = false
LIMIT $3
)
`, [userId, actualCardId, toRemove]);
            results.updated++;
          }
        } catch (cardErr) {
          console.error(`Error processing card ${cardId}:`, cardErr);
          results.errors++;
          const errorMsg = `Error processing ${cardId}: ${cardErr.message}`;
          results.errorDetails.push(errorMsg);
          results.errorLines.push({
            lineNumber,
            line: trimmedLine,
            error: `Database error: ${cardErr.message}`
          });

          // For critical database errors, abort the entire transaction
          if (cardErr.code && ['25P02', '23505', '23502', '23503'].includes(cardErr.code)) {
            console.error('Critical database error, aborting transaction:', cardErr);
            throw cardErr; // This will cause the transaction to rollback
          }
          // For other errors, continue processing other cards
        }
      }

      return results; // Return results on successful completion
    });

    res.json({
      message: `Collection import completed (${mode} mode)`,
      processed: results.processed,
      updated: results.updated,
      errors: results.errors,
      mode: mode, // Include the mode in the response
      errorDetails: results.errorDetails.slice(0, 10), // Limit error details to first 10
      errorLines: results.errorLines.slice(0, 10) // Add this for frontend compatibility
    });

  } catch (err) {
    console.error('Error importing collection:', err);

    // If the error is the transaction already aborted error, provide a more helpful message
    if (err.code === '25P02') {
      res.status(500).json({
        message: 'Database transaction error during import. Please try again.',
        error: 'Transaction was aborted due to a database error',
        processed: results.processed,
        updated: 0, // Nothing was committed due to rollback
        errors: results.errors,
        mode: mode,
        errorDetails: results.errorDetails.slice(0, 5),
        errorLines: results.errorLines.slice(0, 5)
      });
    } else {
      res.status(500).json({
        message: 'Server error while importing collection.',
        processed: results.processed,
        updated: 0, // Nothing was committed due to rollback
        errors: results.errors,
        mode: mode,
        errorDetails: results.errorDetails.slice(0, 5),
        errorLines: results.errorLines.slice(0, 5)
      });
    }
  }
});

// --- DECK ROUTES ---

// Get all decks for the authenticated user
app.get('/api/decks', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(`
SELECT
d.id,
  d.name,
  d.thumbnail,
  d.location_id,
  l.name as location_name,
  l.type as location_type,
  l.marker as location_marker,
  d.created_at,
  d.updated_at,
COUNT(dc.id) as card_count,
  SUM(dc.count) as total_cards
  FROM decks d
  LEFT JOIN locations l ON d.location_id = l.id
  LEFT JOIN deck_cards dc ON d.id = dc.deck_id
  WHERE d.user_id = $1
  GROUP BY d.id, d.name, d.thumbnail, d.location_id, l.name, l.type, l.marker, d.created_at, d.updated_at
  ORDER BY d.updated_at DESC
`, [userId]);

    const decks = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      thumbnail: row.thumbnail,
      location: row.location_id ? {
        id: row.location_id,
        name: row.location_name,
        type: row.location_type,
        marker: row.location_marker
      } : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      card_count: parseInt(row.card_count) || 0,
      total_cards: parseInt(row.total_cards) || 0,
      cards: [] // Cards will be loaded separately when needed
    }));

    res.json(decks);
  } catch (err) {
    console.error('Error fetching decks:', err);
    res.status(500).json({ message: 'Server error while fetching decks.' });
  }
});

// Get a specific deck with full card details
app.get('/api/decks/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Get deck info
    const deckResult = await query(`
SELECT
  d.id,
    d.name,
    d.thumbnail,
    d.location_id,
    l.name as location_name,
    l.type as location_type,
    l.marker as location_marker,
    d.created_at,
    d.updated_at
    FROM decks d
    LEFT JOIN locations l ON d.location_id = l.id
  WHERE d.id = $1 AND d.user_id = $2
`, [id, userId]);

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ message: 'Deck not found or access denied.' });
    }

    const deck = deckResult.rows[0];

    // Get deck cards with full card details
    const cardsResult = await query(`
SELECT
  dc.count,
    dc.card_code,
    c.id,
    c.card_code as full_card_code,
    c.name,
    c.rarity,
    c.category,
    c.color,
    c.cost,
    c.power,
    c.counter,
    c.effect,
    c.trigger_effect,
    c.img_url,
    c.attributes,
    c.types,
    c.block
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = $1
    ORDER BY
    CASE WHEN c.category = 'LEADER' THEN 0 ELSE 1 END,
  c.cost ASC,
  c.name ASC
`, [id]);

    const formattedDeck = {
      id: deck.id,
      name: deck.name,
      thumbnail: deck.thumbnail,
      location: deck.location_id ? {
        id: deck.location_id,
        name: deck.location_name,
        type: deck.location_type,
        marker: deck.location_marker
      } : null,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      cards: cardsResult.rows.map(row => ({
        card: {
          id: row.id,
          card_code: row.full_card_code,
          name: row.name,
          rarity: row.rarity,
          category: row.category,
          color: row.color,
          cost: row.cost,
          power: row.power,
          counter: row.counter,
          effect: row.effect,
          trigger_effect: row.trigger_effect,
          img_url: row.img_url,
          attributes: row.attributes,
          types: row.types,
          block: row.block
        },
        count: row.count
      }))
    };

    res.json(formattedDeck);
  } catch (err) {
    console.error('Error fetching deck:', err);
    res.status(500).json({ message: 'Server error while fetching deck.' });
  }
});

// Create a new deck
app.post('/api/decks', isAuthenticated, async (req, res) => {
  const { name, thumbnail, cards, location } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Deck name is required.' });
  }

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ message: 'Deck must have at least one card.' });
  }

  // Validate deck composition
  const leaders = cards.filter(item => {
    // We need to check if the card is a leader - this requires looking up the card
    return item.card_code && item.card_code.includes('LEADER');
  });

  try {
    await query('BEGIN');

    // Check if deck name already exists for this user
    const nameCheck = await query(
      'SELECT id FROM decks WHERE user_id = $1 AND name = $2',
      [userId, name.trim()]
    );

    if (nameCheck.rows.length > 0) {
      await query('ROLLBACK');
      return res.status(409).json({ message: 'A deck with this name already exists.' });
    }

    // Create the deck
    const deckResult = await query(`
INSERT INTO decks (user_id, name, thumbnail, location_id)
VALUES ($1, $2, $3, $4)
RETURNING id, name, thumbnail, location_id, created_at, updated_at
`, [userId, name.trim(), thumbnail, location]);

    const deckId = deckResult.rows[0].id;

    // Add cards to the deck
    for (const item of cards) {
      if (!item.card_id || !item.card_code || !item.count) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid card data in deck.' });
      }

      if (item.count < 1 || item.count > 4) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Card count must be between 1 and 4.' });
      }

      await query(`
INSERT INTO deck_cards (deck_id, card_id, card_code, count)
VALUES ($1, $2, $3, $4)
`, [deckId, item.card_id, item.card_code, item.count]);
    }

    await query('COMMIT');

    const newDeck = {
      ...deckResult.rows[0],
      cards: cards
    };

    res.status(201).json(newDeck);
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error creating deck:', err);

    if (err.code === '23505') { // Unique constraint violation
      res.status(409).json({ message: 'A deck with this name already exists.' });
      } else {
      res.status(500).json({ message: 'Server error while creating deck.' });
    }
  }
});

// Update an existing deck
app.put('/api/decks/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name, thumbnail, cards, location } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Deck name is required.' });
  }

  if (!cards || !Array.isArray(cards)) {
    return res.status(400).json({ message: 'Cards array is required.' });
  }

  try {
    await query('BEGIN');

    // Check if deck exists and belongs to user
    const deckCheck = await query(
      'SELECT id, name FROM decks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (deckCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Deck not found or access denied.' });
    }

    // Check if name conflicts with another deck (excluding current deck)
    const nameCheck = await query(
      'SELECT id FROM decks WHERE user_id = $1 AND name = $2 AND id != $3',
      [userId, name.trim(), id]
    );

    if (nameCheck.rows.length > 0) {
      await query('ROLLBACK');
      return res.status(409).json({ message: 'A deck with this name already exists.' });
    }

    // Update deck info
    const deckResult = await query(`
UPDATE decks
  SET name = $1, thumbnail = $2, location_id = $3, updated_at = NOW()
WHERE id = $4 AND user_id = $5
  RETURNING id, name, thumbnail, location_id, created_at, updated_at
`, [name.trim(), thumbnail, location, id, userId]);

    // Delete existing deck cards
    await query('DELETE FROM deck_cards WHERE deck_id = $1', [id]);

    // Add updated cards
    for (const item of cards) {
      if (!item.card_id || !item.card_code || !item.count) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid card data in deck.' });
      }

      if (item.count < 1 || item.count > 4) {
        await query('ROLLBACK');
        return res.status(400).json({ message: 'Card count must be between 1 and 4.' });
      }

      await query(`
INSERT INTO deck_cards (deck_id, card_id, card_code, count)
VALUES ($1, $2, $3, $4)
`, [id, item.card_id, item.card_code, item.count]);
    }

    await query('COMMIT');

    const updatedDeck = {
      ...deckResult.rows[0],
      cards: cards
    };

    res.json(updatedDeck);
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error updating deck:', err);

    if (err.code === '23505') { // Unique constraint violation
      res.status(409).json({ message: 'A deck with this name already exists.' });
    } else {
      res.status(500).json({ message: 'Server error while updating deck.' });
    }
  }
});

// Delete a deck
app.delete('/api/decks/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await query('BEGIN');

    // Check if deck exists and belongs to user
    const deckCheck = await query(
      'SELECT id, name FROM decks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (deckCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Deck not found or access denied.' });
    }

    const deckName = deckCheck.rows[0].name;

    // Delete deck cards first (handled by CASCADE, but explicit is clearer)
    await query('DELETE FROM deck_cards WHERE deck_id = $1', [id]);

    // Delete the deck
    await query('DELETE FROM decks WHERE id = $1 AND user_id = $2', [id, userId]);

    await query('COMMIT');

    res.json({
      message: 'Deck deleted successfully.',
      deletedDeck: { id: parseInt(id), name: deckName }
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error deleting deck:', err);
    res.status(500).json({ message: 'Server error while deleting deck.' });
  }
});

// Validate deck composition (helper endpoint)
app.post('/api/decks/validate', isAuthenticated, async (req, res) => {
  const { cards } = req.body;

  if (!cards || !Array.isArray(cards)) {
    return res.status(400).json({ message: 'Cards array is required.' });
  }

  try {
    const cardIds = cards.map(item => item.card_id);

    // Get full card details to validate rules
    const cardDetails = await query(`
SELECT id, card_code, name, category, color
  FROM cards
  WHERE id = ANY($1)
`, [cardIds]);

    const cardMap = new Map();
    cardDetails.rows.forEach(card => {
      cardMap.set(card.id, card);
    });

    const errors = [];
    const warnings = [];

    // Validate each card exists
    for (const item of cards) {
      if (!cardMap.has(item.card_id)) {
        errors.push(`Card with ID ${item.card_id} not found`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ valid: false, errors, warnings });
    }

    // Build full cards array with details
    const fullCards = cards.map(item => ({
      ...item,
      card: cardMap.get(item.card_id)
    }));

    // Validate deck rules
    const leaders = fullCards.filter(item => item.card.category === 'LEADER');
    const nonLeaders = fullCards.filter(item => item.card.category !== 'LEADER');

    // Rule 1: Exactly one leader
    if (leaders.length === 0) {
      errors.push('Deck must have exactly one leader');
    } else if (leaders.length > 1) {
      errors.push('Deck can only have one leader');
    }

    // Rule 2: Maximum 50 cards (excluding leader)
    const totalNonLeaderCards = nonLeaders.reduce((sum, item) => sum + item.count, 0);
    if (totalNonLeaderCards > 50) {
      errors.push(`Deck has ${totalNonLeaderCards} cards, maximum is 50 (excluding leader)`);
    }

    // Rule 3: Color restrictions (if leader exists)
    if (leaders.length === 1) {
      const leaderColors = leaders[0].card.color ? leaders[0].card.color.split('/') : [];

      for (const item of nonLeaders) {
        if (item.card.color) {
          const cardColors = item.card.color.split('/');
          const hasValidColor = cardColors.some(cardColor =>
            leaderColors.includes(cardColor)
          );

          if (!hasValidColor) {
            errors.push(`${item.card.name} (${item.card.color}) doesn't match leader colors (${leaderColors.join('/')})`);
          }
        }
      }
    }

    // Rule 4: Maximum 4 copies per card
    const cardCounts = new Map();
    for (const item of cards) {
      const existing = cardCounts.get(item.card_code) || 0;
      cardCounts.set(item.card_code, existing + item.count);
    }

    for (const [cardCode, count] of cardCounts) {
      if (count > 4) {
        const card = fullCards.find(item => item.card.card_code === cardCode)?.card;
        errors.push(`${card?.name || cardCode} has ${count} copies, maximum is 4`);
      }
    }

    // Add warnings for common issues
    if (totalNonLeaderCards < 40) {
      warnings.push(`Deck has only ${totalNonLeaderCards} cards, consider adding more for better consistency`);
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        hasLeader: leaders.length === 1,
        cardCount: totalNonLeaderCards,
        uniqueCards: nonLeaders.length,
        leaderCard: leaders.length > 0 ? leaders[0].card : null
      }
    });
  } catch (err) {
    console.error('Error validating deck:', err);
    res.status(500).json({ message: 'Server error while validating deck.' });
  }
});

// Get public shared decks
app.get('/api/public/decks', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        deck_title,
        deck_content,
        date_published,
        publisher
      FROM public_shared_decks
      ORDER BY date_published DESC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching public shared decks:', err);
    res.status(500).json({ message: 'Server error while fetching public shared decks.' });
  }
});

// Parse deck content string into deck structure
app.post('/api/public/decks/parse', async (req, res) => {
  const { deckContent } = req.body;

  if (!deckContent || typeof deckContent !== 'string') {
    return res.status(400).json({ message: 'Deck content is required.' });
  }

  try {
    // Parse deck content string (format: "1xOP10-001,4xST15-002,...")
    const cardEntries = deckContent.split(',').map(entry => entry.trim()).filter(entry => entry);
    const parsedCards = [];
    const fetchErrors = [];

    for (const entry of cardEntries) {
      const match = entry.match(/^(\d+)x(.+)$/);
      if (!match) {
        fetchErrors.push(`Invalid format: ${entry}`);
        continue;
      }

      const count = parseInt(match[1], 10);
      const cardId = match[2].trim(); // This is actually the card ID, not card_code!

      if (count < 1 || count > 4) {
        fetchErrors.push(`Invalid count for ${cardId}: ${count}`);
        continue;
      }

      // Find card by ID (the published deck content uses card IDs, not card_codes)
      const cardResult = await query(`
        SELECT
          id,
          card_code,
          name,
          rarity,
          category,
          color,
          cost,
          power,
          counter,
          effect,
          trigger_effect,
          img_url,
          attributes,
          types,
          block
        FROM cards
        WHERE id = $1
        LIMIT 1
      `, [cardId]);

      if (cardResult.rows.length > 0) {
        const card = cardResult.rows[0];
        parsedCards.push({
          card: {
            id: card.id,
            card_code: card.card_code,
            name: card.name,
            rarity: card.rarity,
            category: card.category,
            color: card.color,
            cost: card.cost,
            power: card.power,
            counter: card.counter,
            effect: card.effect,
            trigger_effect: card.trigger_effect,
            img_url: card.img_url,
            attributes: card.attributes,
            types: card.types,
            block: card.block
          },
          count: count
        });
      } else {
        fetchErrors.push(`Card not found: ${cardId}`);
      }
    }

    res.json({
      cards: parsedCards,
      errors: fetchErrors,
      success: fetchErrors.length === 0
    });

  } catch (err) {
    console.error('Error parsing deck content:', err);
    res.status(500).json({ message: 'Server error while parsing deck content.' });
  }
});

app.get('/api/collection/statistics', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    // Add created_at column if it doesn't exist
    try {
      await query(`
        ALTER TABLE owned_cards
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
      `);
    } catch (err) {
      // Column might already exist, continue
    }

    // Get all owned cards with card details
    const ownedCardsResult = await query(`
      SELECT
        oc.card_id,
        c.name,
        c.card_code,
        c.color,
        c.rarity,
        c.block,
        COUNT(*) as count,
        MIN(oc.created_at) as first_added
      FROM owned_cards oc
      JOIN cards c ON oc.card_id = c.id
      WHERE oc.user_id = $1 AND oc.is_proxy = false
      GROUP BY oc.card_id, c.name, c.card_code, c.color, c.rarity, c.block
      ORDER BY count DESC
    `, [userId]);

    // SAFE: Keep original pack distribution query that was working
    const packDistributionResult = await query(`
      SELECT
        SUBSTRING(cpa.pack_code FROM '^[A-Z]+[0-9]+') as pack_prefix,
        COUNT(DISTINCT oc.card_id) as count
      FROM owned_cards oc
      JOIN card_pack_appearances cpa ON oc.card_id = cpa.card_id
      WHERE oc.user_id = $1 AND oc.is_proxy = false
      GROUP BY pack_prefix
      ORDER BY count DESC
    `, [userId]);

    // Get timeline data for the last 30 days
    const timelineResult = await query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      ),
      daily_additions AS (
        SELECT
          DATE(oc.created_at) as date,
          COUNT(*) as cards_added
        FROM owned_cards oc
        WHERE oc.user_id = $1
          AND oc.is_proxy = false
          AND oc.created_at >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY DATE(oc.created_at)
      )
      SELECT
        ds.date,
        COALESCE(da.cards_added, 0) as cards_added
      FROM date_series ds
      LEFT JOIN daily_additions da ON ds.date = da.date
      ORDER BY ds.date ASC
    `, [userId]);

    // Get total available cards for completion rate
    const totalCardsResult = await query('SELECT COUNT(DISTINCT id) as total FROM cards');

    const ownedCards = ownedCardsResult.rows;
    const totalAvailableCards = parseInt(totalCardsResult.rows[0].total);

    // Calculate basic statistics
    const uniqueCardCount = ownedCards.length;
    const totalCardCount = ownedCards.reduce((sum, card) => sum + parseInt(card.count), 0);
    const completionRate = totalAvailableCards > 0 ? (uniqueCardCount / totalAvailableCards) * 100 : 0;

    // Color distribution
    const colorDistribution = {};
    ownedCards.forEach(card => {
      const color = card.color || '';
      colorDistribution[color] = (colorDistribution[color] || 0) + parseInt(card.count);
    });

    // Rarity distribution
    const rarityDistribution = {};
    ownedCards.forEach(card => {
      const rarity = card.rarity || 'Unknown';
      rarityDistribution[rarity] = (rarityDistribution[rarity] || 0) + parseInt(card.count);
    });

    // Block distribution
    const blockDistribution = {};
    ownedCards.forEach(card => {
      const block = card.block ? card.block.toString() : 'Unknown';
      blockDistribution[block] = (blockDistribution[block] || 0) + parseInt(card.count);
    });

    // Pack distribution - keep original working logic
    const packDistribution = {};
    packDistributionResult.rows.forEach(row => {
      if (row.pack_prefix) {
        packDistribution[row.pack_prefix] = parseInt(row.count);
      }
    });

    // FALLBACK: If pack distribution is empty, try extracting from card codes
    if (Object.keys(packDistribution).length === 0) {
      console.log('Pack distribution empty, trying fallback method...');
      ownedCards.forEach(card => {
        if (card.card_code) {
          // Extract pack prefix from card code (e.g., "ST01-001" -> "ST01")
          const match = card.card_code.match(/^([A-Z]+[0-9]+)/);
          if (match) {
            const prefix = match[1];
            packDistribution[prefix] = (packDistribution[prefix] || 0) + 1; // Count unique cards, not total count
          }
        }
      });
    }

    // Timeline data for the chart
    const timeline = timelineResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.cards_added)
    }));

    // Collection age (days since first card added)
    let collectionAge = 0;
    if (ownedCards.length > 0) {
      const oldestCard = ownedCards.reduce((oldest, card) => {
        const cardDate = new Date(card.first_added);
        const oldestDate = oldest ? new Date(oldest.first_added) : null;
        return (!oldestDate || cardDate < oldestDate) ? card : oldest;
      }, null);

      if (oldestCard && oldestCard.first_added) {
        const firstAddedDate = new Date(oldestCard.first_added);
        collectionAge = Math.floor((Date.now() - firstAddedDate.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    // Additional statistics
    const averageCardsPerUniqueCard = uniqueCardCount > 0 ? totalCardCount / uniqueCardCount : 0;

    const mostCommonRarity = Object.entries(rarityDistribution)
      .reduce((max, [rarity, count]) => count > max.count ? { rarity, count } : max,
              { rarity: 'None', count: 0 });

    const mostCommonColor = Object.entries(colorDistribution)
      .reduce((max, [color, count]) => count > max.count ? { color, count } : max,
              { color: 'None', count: 0 });

    // Calculate total cards added in the last 30 days
    const recentActivity = timeline.reduce((sum, day) => sum + day.count, 0);

    res.json({
      uniqueCardCount,
      totalCardCount,
      completionRate,
      collectionAge,
      colorDistribution,
      rarityDistribution,
      blockDistribution,
      packDistribution,
      timeline,
      additionalStats: {
        averageCardsPerUniqueCard: Math.round(averageCardsPerUniqueCard * 100) / 100,
        mostCommonRarity: mostCommonRarity.rarity,
        mostCommonColor: mostCommonColor.color || 'Colorless',
        totalPacks: Object.keys(packDistribution).length,
        totalBlocks: Object.keys(blockDistribution).length,
        recentActivity: recentActivity
      }
    });

  } catch (err) {
    console.error('Error fetching collection statistics:', err);
    res.status(500).json({ message: 'Server error while fetching statistics.' });
  }
});

// --- CARD MANAGEMENT ROUTES (Admin Only) ---

// Create a new card (Admin only)
app.post('/api/cards/create', isAuthenticated, isAdmin, async (req, res) => {
  const {
    id,
    card_code,
    name,
    rarity,
    category,
    color,
    cost,
    power,
    counter,
    effect,
    trigger_effect,
    img_url,
    block,
    attributes,
    types
  } = req.body;

  // Validation
  if (!id || !name) {
    return res.status(400).json({
      message: 'Card ID and Name are required.'
    });
  }

  try {
    // Check if card already exists
    const existingCard = await query('SELECT id FROM cards WHERE id = $1', [id]);
    if (existingCard.rows.length > 0) {
      return res.status(409).json({
        message: 'A card with this ID already exists.'
      });
    }

    // Insert the new card
    const insertQuery = `
      INSERT INTO cards (
        id, card_code, name, rarity, category, color, cost, power,
        counter, effect, trigger_effect, img_url, attributes, types, block
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      id.trim(),
      card_code?.trim() || null,
      name.trim(),
      rarity?.trim() || null,
      category?.trim() || null,
      color?.trim() || null,
      cost !== null && cost !== '' ? parseInt(cost) : null,
      power !== null && power !== '' ? parseInt(power) : null,
      counter !== null && counter !== '' ? parseInt(counter) : null,
      effect?.trim() || null,
      trigger_effect?.trim() || null,
      img_url?.trim() || null,
      attributes && attributes.length > 0 ? attributes : null,
      types && types.length > 0 ? types : null,
      block !== null && block !== '' ? parseInt(block) : null
    ];

    const result = await query(insertQuery, values);

    res.status(201).json({
      message: 'Card created successfully.',
      card: result.rows[0]
    });

  } catch (err) {
    console.error('Error creating card:', err);
    res.status(500).json({
      message: 'Server error while creating card.',
      error: err.message
    });
  }
});

// Update an existing card (Admin only)
app.put('/api/cards/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    card_code,
    name,
    rarity,
    category,
    color,
    cost,
    power,
    counter,
    effect,
    trigger_effect,
    img_url,
    block,
    attributes,
    types
  } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({
      message: 'Name is required.'
    });
  }

  try {
    // Check if card exists
    const existingCard = await query('SELECT id FROM cards WHERE id = $1', [id]);
    if (existingCard.rows.length === 0) {
      return res.status(404).json({
        message: 'Card not found.'
      });
    }

    // Update the card
    const updateQuery = `
      UPDATE cards SET
        card_code = $1,
        name = $2,
        rarity = $3,
        category = $4,
        color = $5,
        cost = $6,
        power = $7,
        counter = $8,
        effect = $9,
        trigger_effect = $10,
        img_url = $11,
        attributes = $12,
        types = $13,
        block = $14
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      card_code?.trim() || null,
      name.trim(),
      rarity?.trim() || null,
      category?.trim() || null,
      color?.trim() || null,
      cost !== null && cost !== '' ? parseInt(cost) : null,
      power !== null && power !== '' ? parseInt(power) : null,
      counter !== null && counter !== '' ? parseInt(counter) : null,
      effect?.trim() || null,
      trigger_effect?.trim() || null,
      img_url?.trim() || null,
      attributes && attributes.length > 0 ? attributes : null,
      types && types.length > 0 ? types : null,
      block !== null && block !== '' ? parseInt(block) : null,
      id
    ];

    const result = await query(updateQuery, values);

    res.json({
      message: 'Card updated successfully.',
      card: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({
      message: 'Server error while updating card.',
      error: err.message
    });
  }
});

// Get a specific card by ID for editing (Admin only)
app.get('/api/cards/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('SELECT * FROM cards WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Card not found.'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({
      message: 'Server error while fetching card.',
      error: err.message
    });
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
