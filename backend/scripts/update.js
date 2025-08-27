import { query } from '../src/db.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateData = async () => {
  console.log('UPDATE: Starting thorough update process...');

  let allLatestPacks;
  try {
    const response = await fetch('http://scraper-api:8080/packs?format=json');
    allLatestPacks = JSON.parse(await response.json());
  } catch (err) {
    console.error('UPDATE: Error fetching pack list. Aborting.', err);
    process.exit(1);
  }

  if (!allLatestPacks || allLatestPacks.length === 0) {
      console.log('UPDATE: No packs found from scraper. Aborting.');
      process.exit(0);
  }

  console.log(`UPDATE: Found ${allLatestPacks.length} total packs to check.`);

  await query('BEGIN');
  try {
    let newCardsFound = 0;
    for (let i = 0; i < allLatestPacks.length; i++) {
      const pack = allLatestPacks[i];
      if (!pack.series || !pack.code || !pack.name) continue;

      console.log(`UPDATE: Checking pack ${i + 1}/${allLatestPacks.length}: ${pack.name}`);

      await query('INSERT INTO packs (code, series_id, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING', [pack.code, pack.series, pack.name]);

      let cardsFromPack;
      try {
        const response = await fetch(`http://scraper-api:8080/cards/${pack.series}?format=json`);
        cardsFromPack = JSON.parse(await response.json());
      } catch (err) {
        console.warn(`Could not fetch cards for pack ${pack.code}. Skipping.`);
        continue;
      }

      for (const cardData of cardsFromPack) {
        let attributesArray = cardData.attributes;
        if (attributesArray && typeof attributesArray === 'string') {
            attributesArray = attributesArray.split('/').map(attr => attr.trim());
        }

        let typesArray = cardData.types;
        if (typesArray && typeof typesArray === 'string') {
            typesArray = typesArray.split('/').map(type => type.trim());
        }

        const safeParseInt = (v) => (isNaN(parseInt(v)) ? null : parseInt(v));
        const cardValues = [
          cardData.card_id, cardData.card_code, cardData.name, cardData.rarity, cardData.category,
          cardData.color, safeParseInt(cardData.cost), safeParseInt(cardData.power), safeParseInt(cardData.counter),
          cardData.effect, cardData.trigger, cardData.img_url,
          attributesArray,
          typesArray,
          safeParseInt(cardData.block)
        ];

        const cardInsertResult = await query(`
            INSERT INTO cards (id, card_code, name, rarity, category, color, cost, power, counter, effect, trigger_effect, img_url, attributes, types, block)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING;
        `, cardValues);

        if (cardInsertResult.rowCount > 0) {
            newCardsFound++;
        }

        await query(`INSERT INTO card_pack_appearances (card_id, pack_code) VALUES ($1, $2) ON CONFLICT (card_id, pack_code) DO NOTHING`, [cardData.card_id, pack.code]);
      }
      await sleep(250);
    }
    await query('COMMIT');
    console.log(`UPDATE: Update complete! Found and added ${newCardsFound} new cards. 🚀`);
  } catch (e) {
    await query('ROLLBACK');
    console.error('Error during update transaction:', e);
  } finally {
    process.exit(0);
  }
};

updateData();
