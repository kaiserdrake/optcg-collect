import { query } from '../src/db.js';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  const safeParseInt = (v) => {
    if (v === null || v === undefined || v === '' || isNaN(parseInt(v))) {
      return null;
    }
    return parseInt(v);
  };

  const cardCode = cardData.card_code;
  const cardId = cardData.card_id;

  if (isReprint(cardCode)) {
    const baseCardId = getBaseCardId(cardCode);

    // Check if the base card already exists (by id)
    const existingCardQuery = `
      SELECT id, card_code FROM cards
      WHERE id = $1
    `;
    const existingCardResult = await query(existingCardQuery, [baseCardId]);

    if (existingCardResult.rows.length > 0) {
      // Base card exists, just add the pack appearance
      console.log(`UPDATE: Found existing base card ${baseCardId}, adding pack appearance for ${packCode}`);
      await query(
        `INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
        [baseCardId, packCode]
      );
      return false; // No new card inserted
    } else {
      // Base card doesn't exist, create it with card_code = card_id (no _rN suffix)
      console.log(`UPDATE: Creating new base card ${baseCardId} from reprint ${cardCode}`);

      const cardValues = [
        baseCardId,        // id (use base card ID)
        baseCardId,        // card_code (same as ID, no _rN suffix)
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

      const cardResult = await query(cardInsertQuery, cardValues);

      // Add pack appearance using the base card ID
      await query(
        `INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
        [baseCardId, packCode]
      );

      return cardResult.rowCount > 0;
    }
  } else {
    // Not a reprint, handle normally
    const cardValues = [
      cardId,
      cardCode || cardId, // Use card_code if available, otherwise use card_id
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

    const cardResult = await query(cardInsertQuery, cardValues);

    // Add pack appearance
    await query(
      `INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`,
      [cardId, packCode]
    );

    return cardResult.rowCount > 0;
  }
};

const main = async () => {
  let newCardsFound = 0;
  let packsProcessed = 0;
  const errors = [];

  console.log('UPDATE: Starting card database update...');

  try {
    await query('BEGIN');

    // Fetch all latest packs
    console.log('UPDATE: Fetching latest pack list from scraper...');
    let allLatestPacks;
    try {
      const response = await fetch('http://opcc-scraper-api:8080/packs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      try {
        // The scraper API returns a JSON string that needs to be parsed twice
        const jsonString = JSON.parse(responseText);
        allLatestPacks = JSON.parse(jsonString);
      } catch (parseError) {
        // If double parsing fails, try single parsing
        allLatestPacks = JSON.parse(responseText);
      }
    } catch (err) {
      throw new Error(`Failed to fetch pack list: ${err.message}`);
    }

    console.log(`UPDATE: Found ${allLatestPacks.length} packs to process.`);

    // Insert any new packs first
    for (const pack of allLatestPacks) {
      if (!pack || typeof pack !== 'object' || !pack.series || !pack.code || !pack.name) {
        continue;
      }
      try {
        await query('INSERT INTO packs (code, series_id, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
          [pack.code, pack.series, pack.name]);
      } catch (err) {
        console.warn(`UPDATE: Failed to insert pack ${pack.code}:`, err.message);
      }
    }

    // Process each pack for cards
    for (const pack of allLatestPacks) {
      if (!pack || typeof pack !== 'object' || !pack.series) {
        console.warn(`UPDATE: Skipping invalid pack: ${pack?.name || pack?.code || 'unknown'}`);
        continue;
      }

      console.log(`UPDATE: Processing pack: ${pack.name} (${pack.series})`);

      try {
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

            const cardInserted = await handleCardWithReprintLogic(cardData, pack.code);
            if (cardInserted) {
              newCardsFound++;
            }

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

  } catch (err) {
    await query('ROLLBACK');
    console.error('UPDATE: Fatal error during update process:', err);
    process.exit(1);
  }
};

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
