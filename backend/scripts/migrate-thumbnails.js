import { query } from '../src/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Convert a remote card image URL to the local /card-images/ path.
// Returns null if the URL is not a recognised remote card image URL.
const toLocalPath = (url) => {
  if (!url || typeof url !== 'string') return null;

  // Already a local path — nothing to do
  if (url.startsWith('/card-images/')) return null;

  const match = url.match(/\/images\/cardlist\/card\/(.+)$/);
  if (!match) return null;

  return `/card-images/${match[1]}`;
};

const main = async () => {
  console.log('MIGRATE: Starting deck thumbnail migration...');

  try {
    // Fetch all decks that have a remote thumbnail URL
    const result = await query(`
      SELECT id, thumbnail
      FROM decks
      WHERE thumbnail IS NOT NULL
        AND thumbnail NOT LIKE '/card-images/%'
    `);

    if (result.rows.length === 0) {
      console.log('MIGRATE: No decks with remote thumbnails found. Nothing to do.');
      return;
    }

    console.log(`MIGRATE: Found ${result.rows.length} decks with remote thumbnails.`);

    let updated = 0;
    let skipped = 0;

    for (const deck of result.rows) {
      const localPath = toLocalPath(deck.thumbnail);

      if (!localPath) {
        console.warn(`MIGRATE: Could not convert thumbnail for deck ${deck.id}: ${deck.thumbnail}`);
        skipped++;
        continue;
      }

      await query(
        'UPDATE decks SET thumbnail = $1 WHERE id = $2',
        [localPath, deck.id]
      );
      console.log(`MIGRATE: deck ${deck.id}: ${deck.thumbnail} -> ${localPath}`);
      updated++;
    }

    console.log(`MIGRATE: Done. Updated ${updated} decks, skipped ${skipped}.`);
  } catch (err) {
    console.error('MIGRATE: Fatal error:', err);
    process.exit(1);
  }
};

main();
