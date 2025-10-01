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

// Reprint handling utility functions
const isReprint = (cardCode) => {
  if (!cardCode) return false;
  return /_r\d+$/.test(cardCode); // Only match _rN patterns, not _pN
};

const getBaseCardId = (cardCode) => {
  return cardCode.replace(/_r\d+$/, ''); // Only remove _rN suffixes, not _pN
};

const handleCardWithReprintLogic = async (cardData, packCode) => {
  let attributesArray = cardData.attributes;
  if (attributesArray && typeof attributesArray === 'string') {
    attributesArray = attributesArray.split('/').map(attr => attr.trim()).filter(attr => attr.length > 0);
  }

  let typesArray = cardData.types;
  if (typesArray && typeof typesArray === 'string') {
    typesArray = typesArray.split('/').map(type => type.trim()).filter(type => type.length > 0);
  }

  const safeParseInt = (v) => (v === null || v === undefined || v === '' || isNaN(parseInt(v))) ? null : parseInt(v);

  const cardCode = cardData.card_code;
  const cardId = cardData.card_id;

  // Debug logging for reprints only (_rN, not _pN)
  if (cardId && cardId.includes('_r')) {
    console.log(`INIT: Processing potential reprint - cardId: ${cardId}, cardCode: ${cardCode}`);
  }

  // Check both card_id and card_code for reprint patterns (only _rN)
  const isReprintId = isReprint(cardId);
  const isReprintCode = isReprint(cardCode);

  if (isReprintId || isReprintCode) {
    // Use card_id for reprint detection since that's where the _rN pattern appears
    const baseCardId = isReprintId ? getBaseCardId(cardId) : getBaseCardId(cardCode);

    console.log(`INIT: Detected reprint: ${cardId} -> base: ${baseCardId}`);

    // For reprints, update the base card data but keep the reprint's unique ID
    const cardInsertQuery = `
      INSERT INTO cards (id, card_code, name, rarity, category, color, cost, power, counter, effect, trigger_effect, img_url, attributes, types, block)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        card_code = EXCLUDED.card_code,
        name = EXCLUDED.name,
        rarity = EXCLUDED.rarity,
        category = EXCLUDED.category,
        color = EXCLUDED.color,
        cost = EXCLUDED.cost,
        power = EXCLUDED.power,
        counter = EXCLUDED.counter,
        effect = EXCLUDED.effect,
        trigger_effect = EXCLUDED.trigger_effect,
        img_url = EXCLUDED.img_url,
        attributes = EXCLUDED.attributes,
        types = EXCLUDED.types,
        block = EXCLUDED.block;
    `;

    const cardValues = [
      baseCardId, // Use base card ID as the primary key
      cardCode,
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
      attributesArray || null,
      typesArray || null,
      safeParseInt(cardData.block)
    ];

    const cardResult = await query(cardInsertQuery, cardValues);

    // Add pack appearance for the base card
    await query(
      `INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
      [baseCardId, packCode]
    );

    return cardResult.rowCount > 0;
  } else {
    // Normal card (not a reprint)
    const cardInsertQuery = `
      INSERT INTO cards (id, card_code, name, rarity, category, color, cost, power, counter, effect, trigger_effect, img_url, attributes, types, block)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        card_code = EXCLUDED.card_code,
        name = EXCLUDED.name,
        rarity = EXCLUDED.rarity,
        category = EXCLUDED.category,
        color = EXCLUDED.color,
        cost = EXCLUDED.cost,
        power = EXCLUDED.power,
        counter = EXCLUDED.counter,
        effect = EXCLUDED.effect,
        trigger_effect = EXCLUDED.trigger_effect,
        img_url = EXCLUDED.img_url,
        attributes = EXCLUDED.attributes,
        types = EXCLUDED.types,
        block = EXCLUDED.block;
    `;

    const cardValues = [
      cardId,
      cardCode,
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
      attributesArray || null,
      typesArray || null,
      safeParseInt(cardData.block)
    ];

    const cardResult = await query(cardInsertQuery, cardValues);

    // Add pack appearance
    await query(
      `INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
      [cardId, packCode]
    );

    return cardResult.rowCount > 0;
  }
};

const createTables = async () => {
  console.log('INIT: Dropping all existing tables...');
  await query('DROP TABLE IF EXISTS public_shared_decks;');
  await query('DROP TABLE IF EXISTS deck_cards;');
  await query('DROP TABLE IF EXISTS decks;');
  await query('DROP TABLE IF EXISTS card_tags;');
  await query('DROP TABLE IF EXISTS owned_cards;');
  await query('DROP TABLE IF EXISTS locations CASCADE;');
  await query('DROP TABLE IF EXISTS users CASCADE;');
  await query('DROP TYPE IF EXISTS user_role;');
  await query('DROP TYPE IF EXISTS location_type;');
  await query('DROP TYPE IF EXISTS tag_type;');
  await query('DROP TABLE IF EXISTS card_pack_appearances;');
  await query('DROP TABLE IF EXISTS packs;');
  await query('DROP TABLE IF EXISTS cards;');

  console.log('INIT: Creating new relational tables...');

  await query(`CREATE TYPE user_role AS ENUM ('Admin', 'Normal User');`);
  await query(`CREATE TYPE location_type AS ENUM ('case', 'box', 'binder');`);
  await query(`CREATE TYPE tag_type AS ENUM ('favorite', 'want', 'banned', 'restricted');`);

  await query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) UNIQUE NOT NULL,
      alias VARCHAR(255),
      password_hash TEXT,
      image_url TEXT,
      role user_role NOT NULL DEFAULT 'Normal User',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create locations table
  await query(`
    CREATE TABLE locations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type location_type NOT NULL,
      description TEXT,
      marker VARCHAR(50) NOT NULL DEFAULT 'gray',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
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
  const createOwnedCardsTable = `CREATE TABLE owned_cards (instance_id SERIAL PRIMARY KEY, card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL, is_proxy BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`;

  await query(createCardsTable);
  await query(createPacksTable);
  await query(createCardPackAppearancesTable);
  await query(createOwnedCardsTable);

  // Add card_tags table creation
  const createCardTagsTable = `
    CREATE TABLE card_tags (
      id SERIAL PRIMARY KEY,
      card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      tag_type tag_type NOT NULL,
      is_global BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_tag_check CHECK (
        (is_global = false AND user_id IS NOT NULL) OR
        (is_global = true AND user_id IS NULL)
      ),
      CONSTRAINT global_tag_type_check CHECK (
        (is_global = false) OR
        (is_global = true AND tag_type IN ('banned', 'restricted'))
      ),
      UNIQUE(card_id, user_id, tag_type)
    );
  `;
  await query(createCardTagsTable);

  // Create indexes for card_tags table
  await query('CREATE INDEX idx_card_tags_card_id ON card_tags(card_id);');
  await query('CREATE INDEX idx_card_tags_user_id ON card_tags(user_id) WHERE user_id IS NOT NULL;');
  await query('CREATE INDEX idx_card_tags_global ON card_tags(card_id, tag_type) WHERE is_global = true;');

  // Add unique constraint for global tags (one per card per tag type)
  await query(`
    CREATE UNIQUE INDEX idx_card_tags_global_unique
    ON card_tags(card_id, tag_type)
    WHERE is_global = true;
  `);

  const createDecksTable = `
    CREATE TABLE decks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      thumbnail TEXT, -- URL to the deck thumbnail image
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name) -- User cannot have duplicate deck names
    );
  `;

  const createDeckCardsTable = `
    CREATE TABLE deck_cards (
      id SERIAL PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      card_code VARCHAR(255) NOT NULL, -- Denormalized for easier queries
      count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0 AND count <= 4),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await query(createDecksTable);
  await query(createDeckCardsTable);

  const createPublicSharedDecksTable = `
    CREATE TABLE public_shared_decks (
      id SERIAL PRIMARY KEY,
      deck_title VARCHAR(255) NOT NULL,
      deck_content VARCHAR(712) NOT NULL,
      date_published TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      publisher VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await query(createPublicSharedDecksTable);

  // Create short_urls table for URL shortening feature
  const createShortUrlsTable = `
    CREATE TABLE short_urls (
      id SERIAL PRIMARY KEY,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      access_count INTEGER DEFAULT 0,
      created_by_ip INET,
      user_agent TEXT,
      CONSTRAINT short_code_format CHECK (short_code ~ '^[a-zA-Z0-9]{6,10}$')
    );
  `;

  await query(createShortUrlsTable);

  // Create indexes for short_urls table
  await query('CREATE INDEX idx_short_urls_short_code ON short_urls(short_code);');
  await query('CREATE INDEX idx_short_urls_created_at ON short_urls(created_at DESC);');
  await query('CREATE INDEX idx_short_urls_expires_at ON short_urls(expires_at) WHERE expires_at IS NOT NULL;');

  // Create function to maintain 100 short URL limit
  const createShortUrlLimitFunction = `
    CREATE OR REPLACE FUNCTION maintain_short_url_limit()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Remove oldest entries if we exceed 100 short URLs
      WHILE (SELECT COUNT(*) FROM short_urls) > 100 LOOP
        DELETE FROM short_urls
        WHERE id = (
          SELECT id FROM short_urls
          ORDER BY created_at ASC
          LIMIT 1
        );
      END LOOP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  await query(createShortUrlLimitFunction);

  await query(`
    CREATE TRIGGER maintain_short_url_limit_trigger
    AFTER INSERT ON short_urls
    FOR EACH ROW EXECUTE FUNCTION maintain_short_url_limit();
  `);

  console.log('INIT: Short URLs table created successfully with 100 entry limit.');

  const createLimitFunction = `
    CREATE OR REPLACE FUNCTION maintain_deck_limit()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Remove oldest entries if we exceed 100 decks
      WHILE (SELECT COUNT(*) FROM public_shared_decks) > 100 LOOP
        DELETE FROM public_shared_decks
        WHERE id = (
          SELECT id FROM public_shared_decks
          ORDER BY date_published ASC
          LIMIT 1
        );
      END LOOP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  await query(createLimitFunction);

  await query(`
    CREATE TRIGGER maintain_deck_limit_trigger
    AFTER INSERT ON public_shared_decks
    FOR EACH ROW EXECUTE FUNCTION maintain_deck_limit();
  `);

  await query('CREATE INDEX idx_decks_user_id ON decks(user_id);');
  await query('CREATE INDEX idx_decks_updated_at ON decks(updated_at DESC);');
  await query('CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id);');
  await query('CREATE INDEX idx_deck_cards_card_id ON deck_cards(card_id);');
  await query('CREATE INDEX idx_deck_cards_card_code ON deck_cards(card_code);');

  await query('CREATE INDEX idx_public_shared_decks_date_published ON public_shared_decks(date_published DESC);');
  await query('CREATE INDEX idx_public_shared_decks_publisher ON public_shared_decks(publisher);');

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

  console.log('INIT: Waiting for scraper API to become ready...');

  while (retries < maxRetries) {
    try {
      // Try the /packs endpoint directly since we know it works
      const response = await fetch('http://opcc-scraper-api:8080/packs');

      if (response && response.ok) {
        console.log('INIT: Scraper API is ready.');
        return;
      }
    } catch (err) {
      // Scraper not ready yet, continue trying
    }

    retries++;
    console.log(`INIT: Waiting for scraper API... (attempt ${retries}/${maxRetries})`);
    await sleep(2000);
  }

  throw new Error('INIT: Scraper API did not become ready in time');
};

const populateMasterData = async () => {
    console.log('INIT: Fetching master pack list...');
    let packs;
    try {
        const response = await fetch('http://opcc-scraper-api:8080/packs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseText = await response.text();
        try {
            // The scraper API returns a JSON string that needs to be parsed twice
            const jsonString = JSON.parse(responseText);
            packs = JSON.parse(jsonString);
        } catch (parseError) {
            // If double parsing fails, try single parsing
            packs = JSON.parse(responseText);
        }
    } catch (err) {
        throw new Error(`Failed to fetch pack list: ${err.message}`);
    }

    console.log(`INIT: Found ${packs.length} packs to process.`);

    // Insert pack data first
    for (const pack of packs) {
        if (!pack || typeof pack !== 'object' || !pack.series || !pack.code || !pack.name) {
            console.warn(`INIT: Skipping invalid pack: ${JSON.stringify(pack)}`);
            continue;
        }

        try {
            await query('INSERT INTO packs (code, series_id, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
                [pack.code, pack.series, pack.name]);
        } catch (err) {
            console.warn(`INIT: Failed to insert pack ${pack.code}:`, err.message);
        }
    }

    let totalCardsInserted = 0;
    // Process each pack for cards
    for (const pack of packs) {
        if (!pack || typeof pack !== 'object' || !pack.series) {
            console.warn(`INIT: Skipping invalid pack: ${pack?.name || pack?.code || 'unknown'}`);
            continue;
        }

        console.log(`INIT: Processing pack: ${pack.name} (${pack.series})`);

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
                const cardInserted = await handleCardWithReprintLogic(cardData, pack.code);
                if (cardInserted) {
                    packCardsInserted++;
                    totalCardsInserted++;
                }
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
    "INSERT INTO users (email, name, alias, role, password_hash) VALUES ($1, $2, $3, 'Admin', $4)",
    [adminEmail, adminName, 'Administrator', passwordHash]
  );
  console.log(`INIT: Admin user '${adminName}' created successfully in database with alias 'Administrator'.`);
};

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
                const insertResult = await query("INSERT INTO owned_cards (card_id, user_id, is_proxy) SELECT card_id, user_id, is_proxy FROM owned_cards_backup;");
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
            console.log('INIT: Database initialization complete!');

        } catch (err) {
            await query('ROLLBACK');
            console.error('INIT: Error during initialization:', err);
            throw err;
        }

    } catch (err) {
        console.error('INIT: Fatal error during database initialization:', err);
        process.exit(1);
    }
};

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
