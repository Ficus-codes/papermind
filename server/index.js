import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import authRoutes from "./routes/authRoutes.js";
import paperRoutes from "./routes/paperRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server dir first, then fallback to root or system environment
if (fs.existsSync(path.resolve(__dirname, ".env"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}
if (fs.existsSync(path.resolve(__dirname, "../.env"))) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}
dotenv.config();

const app = express();

// Trust reverse proxy hops (critical for Render, Railway, Heroku, AWS ALB, Cloudflare)
app.set("trust proxy", 1);

// Security HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Prevents breaking CDN fonts (e.g. KaTeX) or external resources
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allows cross-origin API and asset fetching
  })
);

// Dynamic, Secure CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : process.env.CLIENT_URL
  ? [process.env.CLIENT_URL.trim()]
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., mobile apps, curl, health probes) or unrestricted configs
    if (
      !origin ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    // Also allow localhost during development or testing
    if (
      process.env.NODE_ENV !== "production" &&
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy restriction: Origin '${origin}' is not authorized`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
};

app.use(cors(corsOptions));

// Safe Payload Body Parsers with 10MB limits to support rich text/manuscript notes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global baseline rate limiter (300 requests / 15 minutes per IP)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP. Please wait a few moments before trying again.",
    status: 429,
  },
});

app.use("/api/", globalApiLimiter);

// Production Health Check & Diagnostics Endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const isHealthy = dbStatus === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStateMap[dbStatus] || "unknown",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Primary API Routes
app.use("/api/auth", authRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notes", noteRoutes);

// Optional Full-Stack Deployment Mode: Serve built frontend if dist exists
const clientDistPath = path.resolve(__dirname, "../client/dist");

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    next();
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      service: "AI Research Assistant Backend API",
      status: "online",
      version: "1.0.0",
      documentation: "/api/health",
    });
  });
}

// Centralized Production Error Handler (Hides internal stack traces in production)
app.use((err, req, res, next) => {
  console.error("[Server Error]", err);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(status).json({
    message: isProd && status === 500 ? "Internal server error occurred" : (err.message || "An error occurred"),
    ...(isProd ? {} : { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

// Security & Configuration Pre-flight Validation
if (!mongoUri) {
  console.error("[FATAL] Missing MONGO_URI or MONGODB_URI in environment variables. Server cannot start.");
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_random_long_string") {
  if (process.env.NODE_ENV === "production") {
    console.error("[SECURITY ALERT] Default or insecure JWT_SECRET detected in production! Generate a strong random secret.");
  } else {
    console.warn("[SECURITY NOTICE] JWT_SECRET is currently set to a development placeholder.");
  }
}

// Connect to MongoDB & Initialize Server
let server;
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("[Database] MongoDB connection established successfully");
    server = app.listen(PORT, () => {
      console.log(`[Server] Production-ready service running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    });
  })
  .catch((err) => {
    console.error("[Database] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

// Graceful Process Termination Handlers
const gracefulShutdown = (signal) => {
  console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log("[Server] HTTP server closed");
      mongoose.connection.close(false).then(() => {
        console.log("[Database] MongoDB connection terminated cleanly");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
