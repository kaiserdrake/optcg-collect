# Building

Rebuild the containers:
```sh
docker compose down
docker compose up --build -d
```

Check if services are running:
```sh
docker compose ps
```

Initialize database:
```sh
docker compose exec opcc-backend npm run db:init
```

# Card Image Management

Card images are downloaded and hosted locally under `${OPCC_DATA_PATH}/cards` to avoid cross-origin restrictions from the official card game site.

Images are downloaded in priority order:
1. **English** (`en.onepiece-cardgame.com`)
2. **Asia-EN** (`asia-en.onepiece-cardgame.com`)
3. **Japanese** (`www.onepiece-cardgame.com`) — for promo/exclusive cards not available on EN or Asia-EN

## Sync all card images

Run as part of the normal database update. Only downloads images that are not yet stored locally:
```sh
docker compose exec opcc-backend npm run db:update
```

## Download a single card image

Use this for cards that are not in the scraper list (e.g. promos like `P-096`), or to re-download a specific card image.

Download (skips if file already exists):
```sh
docker compose exec opcc-backend npm run db:fetch-image -- <card-id>
```

Force re-download even if the file already exists:
```sh
docker compose exec opcc-backend npm run db:fetch-image -- <card-id> --force
```

Examples:
```sh
docker compose exec opcc-backend npm run db:fetch-image -- P-096
docker compose exec opcc-backend npm run db:fetch-image -- OP10-119_p3 --force
```

## Migrate existing deck thumbnails

After running `db:update` for the first time, existing saved decks may still reference old remote image URLs in their thumbnail field. Run this once to update them to local paths:
```sh
docker compose exec opcc-backend npm run db:migrate-thumbnails
```

# Deployment

# Debugging

Checking for database entries:
```sh
docker exec -it opcc-db psql -U user -d tcg_db
```

Test backend directly from your host:
```sh
curl http://localhost:3001/api/health
```
