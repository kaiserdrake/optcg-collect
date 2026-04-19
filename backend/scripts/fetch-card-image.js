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

// Build candidate URLs for a given card ID, trying all three hosts.
// cardId is used to construct the standard image path if no DB URL is available.
const buildCandidates = (cardId, dbImgUrl) => {
  const candidates = [];

  // Derive the image path from the DB URL if available, otherwise construct it
  const imagePath = dbImgUrl
    ? (dbImgUrl.match(/\/images\/.+$/)?.[0] || null)
    : `/images/cardlist/card/${cardId}.png`;

  if (!imagePath) return candidates;

  // 1. English
  candidates.push(`https://en.onepiece-cardgame.com${imagePath}`);
  // 2. Asia-EN
  candidates.push(`https://asia-en.onepiece-cardgame.com${imagePath}`);
  // 3. Japanese (www) — promo/exclusive cards
  candidates.push(`https://www.onepiece-cardgame.com${imagePath}`);

  return candidates;
};

const downloadCardImage = async (cardId, force = false) => {
  const filename = `${cardId}.png`;
  const localPath = path.join(IMAGE_DIR, filename);
  const localUrl = `/card-images/${filename}`;

  if (!force && fs.existsSync(localPath)) {
    console.log(`FETCH-IMG: Image already exists at ${localPath}. Use --force to re-download.`);
    return localUrl;
  }

  // Look up the card in the DB to get its current img_url
  const result = await query('SELECT id, img_url FROM cards WHERE id = $1', [cardId]);

  if (result.rows.length === 0) {
    console.error(`FETCH-IMG: Card '${cardId}' not found in database.`);
    return null;
  }

  const card = result.rows[0];
  const dbImgUrl = card.img_url?.startsWith('/card-images/') ? null : card.img_url;

  console.log(`FETCH-IMG: Attempting download for card '${cardId}'...`);

  const candidates = buildCandidates(cardId, dbImgUrl);

  for (const url of candidates) {
    console.log(`FETCH-IMG: Trying ${url} ...`);
    const response = await tryFetch(url);
    if (response) {
      try {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(buffer));

        const source = url.includes('en.onepiece-cardgame.com') && !url.includes('asia-en')
          ? 'English'
          : url.includes('www.onepiece-cardgame.com')
            ? 'Japanese (www)'
            : 'Asia-EN';

        console.log(`FETCH-IMG: Downloaded from ${source} source.`);

        // Update img_url in DB to the local path
        await query('UPDATE cards SET img_url = $1 WHERE id = $2', [localUrl, cardId]);
        console.log(`FETCH-IMG: Updated img_url in database to ${localUrl}`);

        return localUrl;
      } catch (err) {
        console.warn(`FETCH-IMG: Failed to write file: ${err.message}`);
      }
    } else {
      console.log(`FETCH-IMG: Not available.`);
    }
  }

  console.error(`FETCH-IMG: Could not download image for '${cardId}' from any source.`);
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
