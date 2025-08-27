
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


