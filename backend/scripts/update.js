import { query } from '../src/db.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForScraperAPI = async () => {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch('http://opcc-scraper-api:8080/packs?format=json');
      if (response.ok) {
        console.log('UPDATE: Scraper API connection established.');
        return;
      }
    } catch (err) {
      // Connection failed, continue retrying
    }

    retries++;
    console.log(`UPDATE: Waiting for scraper API... (attempt ${retries}/${maxRetries})`);
    await sleep(3000);
  }

  throw new Error('UPDATE: Could not connect to scraper API after maximum retries');
};

const updateData = async () => {
  console.log('UPDATE: Starting thorough update process...');

  try {
    // Wait for scraper API to be available
    await waitForScraperAPI();
  } catch (error) {
    console.error('UPDATE: Scraper API unavailable. Aborting update.');
    process.exit(1);
  }

  let allLatestPacks;
  try {
    const response = await fetch('http://opcc-scraper-api:8080/packs?format=json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    try {
      // The scraper API returns a JSON string that needs to be parsed twice
      const jsonString = JSON.parse(responseText);
      allLatestPacks = JSON.parse(jsonString);
    } catch (parseError) {
      // If double parsing fails, try single parsing
      console.log('UPDATE: Double parsing failed, trying single parse...');
      allLatestPacks = JSON.parse(responseText);
    }
  } catch (err) {
    console.error('UPDATE: Error fetching pack list. Aborting.', err);
    process.exit(1);
  }

  if (!Array.isArray(allLatestPacks) || allLatestPacks.length === 0) {
      console.log('UPDATE: No packs found from scraper. Aborting.');
      process.exit(0);
  }

  console.log(`UPDATE: Found ${allLatestPacks.length} total packs to check.`);

  await query('BEGIN');
  try {
    let newCardsFound = 0;
    let packsProcessed = 0;
    let errors = [];

    for (let i = 0; i < allLatestPacks.length; i++) {
      const pack = allLatestPacks[i];
      if (!pack || typeof pack !== 'object' || !pack.series || !pack.code || !pack.name) {
        console.warn(`UPDATE: Skipping invalid pack at index ${i}:`, pack);
        continue;
      }

      console.log(`UPDATE: Checking pack ${i + 1}/${allLatestPacks.length}: ${pack.name}`);

      try {
        await query('INSERT INTO packs (code, series_id, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
          [pack.code, pack.series, pack.name]);

        let cardsFromPack;
        try {
          const response = await fetch(`http://opcc-scraper-api:8080/cards/${pack.series}?format=json`);
          if (!response.ok) {
            console.warn(`UPDATE: HTTP ${response.status} for pack ${pack.code}. Skipping.`);
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
        } catch (err) {
          const error = `Could not fetch cards for pack ${pack.code}: ${err.message}`;
          console.warn(`UPDATE: ${error}`);
          errors.push(error);
          continue;
        }

        if (!Array.isArray(cardsFromPack)) {
          console.warn(`UPDATE: Invalid card data format for pack ${pack.code}. Expected array.`);
          continue;
        }

        for (const cardData of cardsFromPack) {
          try {
            if (!cardData || typeof cardData !== 'object' || !cardData.card_id || !cardData.name) {
              console.warn(`UPDATE: Skipping invalid card in pack ${pack.code}:`, cardData);
              continue;
            }

            let attributesArray = cardData.attributes;
            if (attributesArray && typeof attributesArray === 'string') {
                attributesArray = attributesArray.split('/').map(attr => attr.trim()).filter(attr => attr.length > 0);
            }

            let typesArray = cardData.types;
            if (typesArray && typeof typesArray === 'string') {
                typesArray = typesArray.split('/').map(type => type.trim()).filter(type => type.length > 0);
            }

            const safeParseInt = (v) => {
              if (v === null || v === undefined || v === '' || isNaN(parseInt(v))) {
                return null;
              }
              return parseInt(v);
            };

            const cardValues = [
              cardData.card_id,
              cardData.card_code || null,
              cardData.name,
              cardData.rarity || null,
              cardData.category || null,
              cardData.color || null,
              safeParseInt(cardData.cost),
              safeParseInt(cardData.power),
              safeParseInt(cardData.counter),
              cardData.effect || null,
              cardData.trigger || null,
              cardData.img_url || null,
              attributesArray || null,
              typesArray || null,
              safeParseInt(cardData.block)
            ];

            const cardInsertResult = await query(`
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
            `, cardValues);

            if (cardInsertResult.rowCount > 0) {
                newCardsFound++;
            }

            await query(`INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
              [cardData.card_id, pack.code]);

          } catch (cardErr) {
            const error = `Failed to process card ${cardData.card_id} in pack ${pack.code}: ${cardErr.message}`;
            console.warn(`UPDATE: ${error}`);
            errors.push(error);
          }
        }

        packsProcessed++;
        await sleep(250); // Rate limiting

      } catch (packErr) {
        const error = `Failed to process pack ${pack.code}: ${packErr.message}`;
        console.error(`UPDATE: ${error}`);
        errors.push(error);
      }
    }

    await query('COMMIT');

    console.log(`UPDATE: Update complete! 🚀`);
    console.log(`  - Processed ${packsProcessed}/${allLatestPacks.length} packs`);
    console.log(`  - Found and updated ${newCardsFound} cards`);

    if (errors.length > 0) {
      console.log(`  - Encountered ${errors.length} errors:`);
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`    ${index + 1}. ${error}`);
      });
      if (errors.length > 10) {
        console.log(`    ... and ${errors.length - 10} more errors`);
      }
    }

  } catch (e) {
    await query('ROLLBACK');
    console.error('UPDATE: Fatal error during update transaction:', e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\nUPDATE: Received SIGINT, shutting down gracefully...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nUPDATE: Received SIGTERM, shutting down gracefully...');
  process.exit(1);
});

updateData();
