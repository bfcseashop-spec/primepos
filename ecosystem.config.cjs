// PM2 config for PrimePOS.
// First time: pm2 start ecosystem.config.cjs
// Deploy (build then restart): npm run build && npm run db:push && npm run pm2:restart
// Ensure .env exists with DATABASE_URL and PORT (e.g. 5010).

module.exports = {
  apps: [
    {
      name: "primepos",
      script: "start.cjs",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "5010" },
      env_file: ".env",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
