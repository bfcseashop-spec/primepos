// Load .env from project root before starting the app (reliable under PM2).
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
process.chdir(__dirname); // so process.cwd() is project root for the rest of the app
require("./dist/index.cjs");
