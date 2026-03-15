// PM2 config for PrimePOS.
// First time: pm2 start ecosystem.config.cjs
// Deploy: ./deploy.sh (uses pm2 delete + start for fresh code load)
// Ensure .env exists with DATABASE_URL and PORT (e.g. 5010).
// Run deploy as the same user that owns PM2 (avoid sudo for pm2 commands if possible).

module.exports = {
  apps: [
    {
      name: "primepos",
      script: "start.cjs",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "5010" },
      env_file: ".env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
    },
  ],
};
