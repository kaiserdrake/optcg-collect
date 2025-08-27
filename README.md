
# Building

Open your terminal in the root tcg-collection/ directory and follow these steps.

Install Dependencies locally: Run npm install inside the backend directory and also inside the frontend directory. This is good practice to generate package-lock.json files which Docker will use.

Bash

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
Build and Start Containers: This command will build the images for your frontend and backend and start all three services in the background.


# Deployment

docker compose down -v

docker compose up --build -d

docker compose exec backend npm run db:init

docker compose exec backend npm run db:update
