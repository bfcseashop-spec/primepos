// PM2 config for PrimePOS. Usage: pm2 start ecosystem.config.cjs
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
