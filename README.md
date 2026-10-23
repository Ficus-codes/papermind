# AI Research Assistant

## Project Overview
A full-stack application designed to assist in AI research, utilizing a decoupled architecture for scalability.

## Tech Stack
- **Client**: React, Tailwind CSS, Vite
- **Server**: Node.js, Express, MongoDB, Mongoose
- **Orchestration**: Concurrently

## Setup Instructions

### 1. Install Dependencies
From the root directory:
```bash
npm install
```
Install server dependencies:
```bash
cd server && npm install
```
Install client dependencies:
```bash
cd client && npm install
```

### 2. Environment Configuration
Create a `.env` file in the server directory based on `.env.example`:
```bash
cp .env.example server/.env
```
Fill in the required variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- `PORT`

### 3. Run the Application
From the root directory:
```bash
npm run dev
```
