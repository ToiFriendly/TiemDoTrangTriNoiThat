const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const mongoose = require("mongoose");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const homeRoutes = require("./routes/homeRoutes");
const shopRoutes = require("./routes/shopRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const requestLogger = require("./middlewares/requestLogger");
const { createOriginValidator, parseAllowedOrigins } = require("./utils/cors");
const { initializeSocket } = require("./utils/socket");

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);
const validateOrigin = createOriginValidator(allowedOrigins);
const server = http.createServer(app);

app.use(requestLogger);
app.use(
  cors({
    origin: validateOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "Backend auth is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error.",
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || undefined,
    });

    initializeSocket(server, { allowedOrigins });

    server.listen(port, () => {
      console.log(`Backend is running on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
