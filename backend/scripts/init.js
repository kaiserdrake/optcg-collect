import { query } from '../src/db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Wait for database to be ready
const waitForDatabase = async () => {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await query('SELECT 1');
      console.log('INIT: Database connection established.');
      return;
    } catch (err) {
      retries++;
      console.log(`INIT: Waiting for database... (attempt ${retries}/${maxRetries})`);
      await sleep(2000);
    }
  }

  throw new Error('INIT: Could not connect to database after maximum retries');
};

const createTables = async () => {
  console.log('INIT: Dropping all existing tables...');
  await query('DROP TABLE IF EXISTS owned_cards;');
  await query('DROP TABLE IF EXISTS users CASCADE;');
  await query('DROP TYPE IF EXISTS user_role;');
  await query('DROP TABLE IF EXISTS card_pack_appearances;');
  await query('DROP TABLE IF EXISTS packs;');
  await query('DROP TABLE IF EXISTS cards;');

  console.log('INIT: Creating new relational tables...');

  await query(`CREATE TYPE user_role AS ENUM ('Admin', 'Normal User');`);
  await query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT,
      image_url TEXT,
      role user_role NOT NULL DEFAULT 'Normal User',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const createCardsTable = `
    CREATE TABLE cards (
      id VARCHAR(255) PRIMARY KEY,
      card_code VARCHAR(255),
      name TEXT NOT NULL,
      rarity VARCHAR(50),
      category VARCHAR(50),
      color VARCHAR(50),
      cost INT,
      power INT,
      counter INT,
      effect TEXT,
      trigger_effect TEXT,
      img_url TEXT,
      attributes TEXT[],
      types TEXT[],
      block INT
    );
  `;
  const createPacksTable = `CREATE TABLE packs (code VARCHAR(255) PRIMARY KEY, series_id VARCHAR(255) UNIQUE NOT NULL, name TEXT NOT NULL);`;
  const createCardPackAppearancesTable = `CREATE TABLE card_pack_appearances (card_id VARCHAR(255) REFERENCES cards(id) ON DELETE CASCADE, pack_code VARCHAR(255) REFERENCES packs(code) ON DELETE CASCADE, PRIMARY KEY (card_id, pack_code));`;
  const createOwnedCardsTable = `CREATE TABLE owned_cards (instance_id SERIAL PRIMARY KEY, card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, location TEXT, is_proxy BOOLEAN DEFAULT false);`;

  await query(createCardsTable);
  await query(createPacksTable);
  await query(createCardPackAppearancesTable);
  await query(createOwnedCardsTable);

  console.log('INIT: Enabling and indexing for fuzzy search...');
  await query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  console.log('INIT: Creating immutable helper function for indexing arrays...');
  await query(`
    CREATE OR REPLACE FUNCTION immutable_array_to_string(arr TEXT[])
    RETURNS TEXT AS $$
    BEGIN
        RETURN array_to_string(arr, ' ');
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  console.log('INIT: Creating GIN index for fast fuzzy searching...');
  await query(`
    CREATE INDEX cards_search_idx ON cards
    USING gin (
        id gin_trgm_ops,
        card_code gin_trgm_ops,
        name gin_trgm_ops,
        effect gin_trgm_ops,
        category gin_trgm_ops,
        trigger_effect gin_trgm_ops,
        immutable_array_to_string(attributes) gin_trgm_ops,
        immutable_array_to_string(types) gin_trgm_ops
    );
  `);

  console.log('INIT: Database schema created successfully.');
};

const waitForScraperAPI = async () => {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch('http://opcc-scraper-api:8080/packs?format=json');
      if (response.ok) {
        console.log('INIT: Scraper API connection established.');
        return;
      }
    } catch (err) {
      // Connection failed, continue retrying
    }

    retries++;
    console.log(`INIT: Waiting for scraper API... (attempt ${retries}/${maxRetries})`);
    await sleep(3000);
  }

  throw new Error('INIT: Could not connect to scraper API after maximum retries');
};

const populateMasterData = async () => {
    console.log('INIT: Fetching all card data from scraper...');
    let packs;
    try {
        const response = await fetch('http://opcc-scraper-api:8080/packs?format=json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // The scraper API returns a JSON string that needs to be parsed twice
        const responseText = await response.text();
        console.log('INIT: Raw response received, parsing...');

        try {
            // First parse to get the JSON string
            const jsonString = JSON.parse(responseText);
            // Second parse to get the actual array
            packs = JSON.parse(jsonString);
        } catch (parseError) {
            // If double parsing fails, try single parsing
            console.log('INIT: Double parsing failed, trying single parse...');
            packs = JSON.parse(responseText);
        }

        console.log(`INIT: Fetched ${packs.length} packs from scraper.`);
    } catch (err) {
        console.error('INIT: Error fetching pack list:', err);
        throw err;
    }

    if (!Array.isArray(packs) || packs.length === 0) {
        console.log('INIT: No packs returned from scraper API or invalid format.');
        console.log('INIT: Received data type:', typeof packs);
        console.log('INIT: First few items:', packs ? packs.slice(0, 3) : 'null');
        return;
    }

    // Insert packs first
    console.log('INIT: Inserting pack definitions...');
    let packsInserted = 0;
    for (const pack of packs) {
        if (!pack || typeof pack !== 'object' || !pack.series || !pack.code || !pack.name) {
            console.log(`INIT: Skipping invalid pack:`, pack);
            continue;
        }
        try {
            await query('INSERT INTO packs (code, series_id, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING', [pack.code, pack.series, pack.name]);
            packsInserted++;
        } catch (err) {
            console.warn(`INIT: Failed to insert pack ${pack.code}:`, err.message);
        }
    }
    console.log(`INIT: Inserted ${packsInserted} pack definitions.`);

    // Process cards for each pack
    let totalCardsInserted = 0;
    for (let i = 0; i < packs.length; i++) {
        const pack = packs[i];
        if (!pack || typeof pack !== 'object' || !pack.series) {
            console.log(`INIT: Skipping pack ${i + 1}/${packs.length} (invalid or no series): ${pack?.name || pack?.code || 'unknown'}`);
            continue;
        }

        console.log(`INIT: Processing pack ${i + 1}/${packs.length}: ${pack.name} (${pack.series})`);

        let cardsFromPack;
        try {
            const response = await fetch(`http://opcc-scraper-api:8080/cards/${pack.series}?format=json`);
            if (!response.ok) {
                console.warn(`INIT: HTTP ${response.status} for pack ${pack.code}. Skipping.`);
                continue;
            }

            const responseText = await response.text();
            try {
                // The scraper API returns a JSON string that needs to be parsed twice
                const jsonString = JSON.parse(responseText);
                cardsFromPack = JSON.parse(jsonString);
            } catch (parseError) {
                // If double parsing fails, try single parsing
                cardsFromPack = JSON.parse(responseText);
            }

            console.log(`INIT: Fetched ${cardsFromPack.length} cards for pack ${pack.name}`);
        } catch (err) {
            console.warn(`INIT: Could not fetch cards for pack ${pack.code}:`, err.message);
            continue;
        }

        if (!Array.isArray(cardsFromPack)) {
            console.warn(`INIT: Invalid card data for pack ${pack.code} - expected array, got:`, typeof cardsFromPack);
            continue;
        }

        let packCardsInserted = 0;
        for (const cardData of cardsFromPack) {
            if (!cardData || typeof cardData !== 'object' || !cardData.card_id || !cardData.name) {
                console.warn(`INIT: Skipping invalid card in pack ${pack.code}:`, {
                    id: cardData?.card_id,
                    name: cardData?.name
                });
                continue;
            }

            try {
                let attributesArray = cardData.attributes;
                // The scraper can return a single string or an array, so we handle both.
                if (attributesArray && typeof attributesArray === 'string') {
                    attributesArray = attributesArray.split('/').map(attr => attr.trim());
                }

                let typesArray = cardData.types;
                if (typesArray && typeof typesArray === 'string') {
                    typesArray = typesArray.split('/').map(type => type.trim());
                }

                const safeParseInt = (v) => (v === null || v === undefined || v === '' || isNaN(parseInt(v))) ? null : parseInt(v);
                const cardValues = [
                  cardData.card_id,
                  cardData.card_code,
                  cardData.name,
                  cardData.rarity,
                  cardData.category,
                  cardData.color,
                  safeParseInt(cardData.cost),
                  safeParseInt(cardData.power),
                  safeParseInt(cardData.counter),
                  cardData.effect,
                  cardData.trigger,
                  cardData.img_url,
                  attributesArray, // Use the processed array
                  typesArray,      // Use the processed array
                  safeParseInt(cardData.block)
                ];

                const cardInsertQuery = `
                    INSERT INTO cards (id, card_code, name, rarity, category, color, cost, power, counter, effect, trigger_effect, img_url, attributes, types, block)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (id) DO NOTHING;
                `;
                const cardResult = await query(cardInsertQuery, cardValues);
                if (cardResult.rowCount > 0) {
                    packCardsInserted++;
                    totalCardsInserted++;
                }

                await query(`INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`, [cardData.card_id, pack.code]);

            } catch (err) {
                console.warn(`INIT: Failed to insert card ${cardData.card_id}:`, err.message);
            }
        }

        console.log(`INIT: Inserted ${packCardsInserted} cards from pack ${pack.name}`);
        await sleep(250);
    }
    console.log(`INIT: Master card data populated. Total cards inserted: ${totalCardsInserted}`);
}

const createAdminUser = async () => {
  console.log('INIT: --- Starting createAdminUser function ---');

  const adminName = process.env.ADMIN_NAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  console.log(`INIT: Read ADMIN_NAME from .env: "${adminName}"`);

  if (!adminName || !adminPassword) {
    console.error('INIT: ERROR - ADMIN_NAME or ADMIN_PASSWORD not found in .env file.');
    throw new Error('ADMIN_NAME and ADMIN_PASSWORD must be set in your .env file.');
  }

  console.log('INIT: Hashing admin password...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);
  console.log('INIT: Password hashed successfully.');

  const adminEmail = `${adminName.toLowerCase()}@internal.local`;
  console.log(`INIT: Preparing to insert user '${adminName}' with email '${adminEmail}'...`);

  await query(
    "INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'Admin', $3)",
    [adminEmail, adminName, passwordHash]
  );
  console.log(`INIT: Admin user '${adminName}' created successfully in database.`);
}

const main = async () => {
    try {
        // Wait for database to be ready
        await waitForDatabase();

        let backupExists = false;
        await query('BEGIN');

        try {
            const checkResult = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'owned_cards');");
            if (checkResult.rows[0].exists) {
                console.log("INIT: Existing 'owned_cards' table found. Creating backup...");
                await query("ALTER TABLE owned_cards RENAME TO owned_cards_backup;");
                backupExists = true;
            }

            await createTables();

            // Wait for scraper API to be ready before populating data
            await waitForScraperAPI();
            await populateMasterData();

            await createAdminUser();

            if (backupExists) {
                console.log("INIT: Restoring collection data from backup...");
                const insertResult = await query("INSERT INTO owned_cards (card_id, user_id, location, is_proxy) SELECT card_id, user_id, location, is_proxy FROM owned_cards_backup;");
                console.log(`INIT: Restored ${insertResult.rowCount} owned card entries.`);

                console.log("INIT: Updating collection ID sequence...");
                const maxIdResult = await query("SELECT MAX(instance_id) FROM owned_cards");
                const maxId = maxIdResult.rows[0].max;
                if (maxId) {
                    await query("SELECT setval('owned_cards_instance_id_seq', $1)", [maxId]);
                }

                console.log("INIT: Removing temporary backup table...");
                await query("DROP TABLE owned_cards_backup;");
            }

            await query('COMMIT');
            console.log('INIT: Database initialization complete! 🚀');
        } catch (e) {
            await query('ROLLBACK');
            console.error('INIT: An error occurred during initialization. Transaction rolled back.', e);
            throw e;
        }
    } catch (error) {
        console.error('INIT: Fatal error:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

main();
