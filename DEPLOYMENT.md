# Production Deployment Guide — AI Research Assistant (Papermind)

This document contains everything needed to securely and reliably deploy both the backend API and the frontend application to production.

---

## 1. Pre-Deployment Security & Verification Checklist

- [x] **Git Repository Cleanliness**: Verified `.gitignore` prevents leaks of `.env` files, API keys, and temporary artifacts while ensuring all models and services are tracked.
- [x] **HTTP Security Headers**: Installed and configured `helmet` with secure cross-origin resource policy.
- [x] **CORS Hardening**: Configured dynamic CORS using `ALLOWED_ORIGINS` / `CLIENT_URL` with credentials support.
- [x] **Reverse Proxy Trust**: Enabled `app.set("trust proxy", 1)` for accurate client IP resolution behind Cloudflare, Render, AWS ALB, etc.
- [x] **Rate Limiting**:
  - Global API limiter: 300 requests / 15 min
  - Auth limiter (login/register/password reset): 20 requests / 15 min
  - File upload limiter: 15 uploads / 15 min
  - LLM synthesis limiter: 30 requests / 15 min
- [x] **Body Parser Protection**: Explicit 10MB limits configured to support manuscript uploads while preventing denial-of-service memory exhaustion.
- [x] **Frontend Architecture**: Eliminated all hardcoded `http://localhost:5000` URLs. All client requests use a centralized, environment-aware API client (`VITE_API_URL`) with automatic JWT injection and session expiration handling.
- [x] **Health Check & Probes**: `/api/health` endpoint deployed with database connectivity status and process uptime.
- [x] **SPA Routing Rules**: `_redirects` and `vercel.json` included for seamless client-side routing on static hosts.
- [x] **Graceful Shutdown**: Handlers for `SIGTERM` and `SIGINT` to gracefully close database and server sockets without dropping active user connections.

---

## 2. Environment Variables Reference

### Backend (`server`)

| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Listening port (assigned automatically by cloud hosts) | Yes | `5000` |
| `MONGO_URI` or `MONGODB_URI` | MongoDB connection string (Atlas replica set) | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/papermind?retryWrites=true&w=majority` |
| `JWT_SECRET` | Cryptographically random secret for signing JWTs | Yes | *(64+ random characters)* |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | Recommended | `https://yourdomain.com,https://app.yourdomain.com` |
| `CLIENT_URL` | Alternative single frontend URL | Optional | `https://yourdomain.com` |
| `ANTHROPIC_API_KEY` | Primary LLM key for Claude (RAG & Synthesis) | Recommended | `sk-ant-...` |
| `OPENAI_API_KEY` | Secondary LLM key & OpenAI Vector Embeddings | Recommended | `sk-proj-...` |
| `GROQ_API_KEY` | High-speed LLM fallback | Optional | `gsk_...` |
| `MOCK_EMBEDDINGS` | Generate synthetic embeddings if offline | No | `false` (default) |

> **Security Tip**: Generate your production `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Frontend (`client`)

| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Full URL of backend API | If decoupled | `https://api.yourdomain.com` (leave empty if unified) |

---

## 3. Deployment Architectures

### Option A: Unified Full-Stack Service (Render / Railway / VPS / Docker)
*The backend API serves both the API routes (`/api/*`) and the compiled React frontend.*

1. **Build Command**:
   ```bash
   npm run build
   ```
   *(Installs dependencies, builds Vite frontend into `client/dist`)*
2. **Start Command**:
   ```bash
   npm start
   ```
   *(Runs `node server/index.js`)*
3. **Environment Variables**: Add all backend environment variables (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, etc.).

---

### Option B: Decoupled Deployment (Vercel/Netlify for Frontend + Render/Railway for Backend)

#### 1. Backend Service (Render / Railway / Fly.io)
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (or `node index.js`)
- **Health Check Path**: `/api/health`
- **Environment Variables**: Set `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS=https://your-frontend.vercel.app`, and AI API keys.

#### 2. Frontend Static Site (Vercel / Netlify / Cloudflare Pages)
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Set `VITE_API_URL=https://your-backend-api.onrender.com`

---

## 4. MongoDB Atlas Configuration

1. **Network Access**:
   - In MongoDB Atlas, go to **Network Access** > **IP Access List**.
   - Add your cloud provider's static IP range or `0.0.0.0/0` (Allow Access from Anywhere) with strong user authentication.
2. **Atlas Vector Search Index (Optional for Vector Acceleration)**:
   - Target Collection: `chunks`
   - Index Name: `vector_index`
   - Definition:
     ```json
     {
       "fields": [
         {
           "type": "vector",
           "path": "embedding",
           "numDimensions": 1536,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "paperId"
         },
         {
           "type": "filter",
           "path": "userId"
         }
       ]
     }
     ```
   *(Note: The server includes an automatic, transparent fallback to in-memory cosine similarity if Atlas search is not yet indexed).*
