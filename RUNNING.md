# Run locally
1. Clone the repo and cd into it
2. Backend
cd backend
cp .env.example .env
# fill MISTRAL_API_KEY and other vars
npm install
npm run dev
3. Frontend
cd ../frontend
npm install
npm run dev
4. Open http://localhost:5173
Notes:
- The frontend proxies /api to http://localhost:8080 by default (see
vite.config.js)
- Set FRONTEND_ORIGIN and MISTRAL env vars in backend .env for CORS & key
- The server caches responses for identical (text, cellId)