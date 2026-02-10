// Load .env from project root before starting the app (reliable under PM2).
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
require("./dist/index.cjs");
