import { query } from '../src/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const IMAGE_DIR = '/usr/src/app/card-images';

const ensureImageDir = () => {
  if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
  }
};

const tryFetch = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://en.onepiece-cardgame.com/',
      }
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
};

const downloadCardImage = async (cardId, force = false) => {
  const filename = `${cardId}.png`;
  const localPath = path.join(IMAGE_DIR, filename);
  const localUrl = `/card-images/${filename}`;

  if (!force && fs.existsSync(localPath)) {
    console.log(`FETCH-IMG: Image already exists at ${localPath}. Use --force to re-download.`);
    return localUrl;
  }

  // Look up the card — exact match first, then case-insensitive
  let result = await query('SELECT id FROM cards WHERE id = $1', [cardId]);
  if (result.rows.length === 0) {
    result = await query('SELECT id FROM cards WHERE LOWER(id) = LOWER($1)', [cardId]);
  }

  if (result.rows.length === 0) {
    const similar = await query(
      "SELECT id FROM cards WHERE LOWER(id) LIKE LOWER($1) ORDER BY id LIMIT 10",
      [`%${cardId}%`]
    );
    if (similar.rows.length > 0) {
      console.error(`FETCH-IMG: Card '${cardId}' not found. Did you mean one of these?`);
      similar.rows.forEach(r => console.error(`  ${r.id}`));
    } else {
      console.error(`FETCH-IMG: Card '${cardId}' not found in database.`);
    }
    return null;
  }

  const resolvedId = result.rows[0].id;
  if (resolvedId !== cardId) {
    console.log(`FETCH-IMG: Resolved '${cardId}' -> '${resolvedId}'`);
  }

  // Build the standard image path from the resolved card ID.
  // Always try all three hosts regardless of what img_url currently says.
  const imagePath = `/images/cardlist/card/${resolvedId}.png`;
  const candidates = [
    { url: `https://en.onepiece-cardgame.com${imagePath}`,   source: 'English' },
    { url: `https://asia-en.onepiece-cardgame.com${imagePath}`, source: 'Asia-EN' },
    { url: `https://www.onepiece-cardgame.com${imagePath}`,  source: 'Japanese (www)' },
  ];

  console.log(`FETCH-IMG: Attempting download for card '${resolvedId}'...`);

  for (const { url, source } of candidates) {
    console.log(`FETCH-IMG: Trying ${source}: ${url} ...`);
    const response = await tryFetch(url);
    if (response) {
      try {
        const resolvedFilename = `${resolvedId}.png`;
        const resolvedLocalPath = path.join(IMAGE_DIR, resolvedFilename);
        const resolvedLocalUrl = `/card-images/${resolvedFilename}`;

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(resolvedLocalPath, Buffer.from(buffer));
        console.log(`FETCH-IMG: Downloaded from ${source}.`);

        await query('UPDATE cards SET img_url = $1 WHERE id = $2', [resolvedLocalUrl, resolvedId]);
        console.log(`FETCH-IMG: Updated img_url in database to ${resolvedLocalUrl}`);

        return resolvedLocalUrl;
      } catch (err) {
        console.warn(`FETCH-IMG: Failed to write file: ${err.message}`);
      }
    } else {
      console.log(`FETCH-IMG: Not available.`);
    }
  }

  console.error(`FETCH-IMG: Could not download image for '${resolvedId}' from any source.`);
  return null;
};

const main = async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const cardId = args.find(a => !a.startsWith('--'));

  if (!cardId) {
    console.error('Usage: node scripts/fetch-card-image.js <card-id> [--force]');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/fetch-card-image.js P-096');
    console.error('  node scripts/fetch-card-image.js OP10-119_p3 --force');
    process.exit(1);
  }

  ensureImageDir();

  const result = await downloadCardImage(cardId, force);
  if (!result) {
    process.exit(1);
  }
};

main();
