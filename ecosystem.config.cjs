// PM2 process config — used for zero-downtime deployments.
// Start with: pm2 start ecosystem.config.cjs
// Then save and enable startup: pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      // Remix web server — cluster mode enables zero-downtime reloads via `pm2 reload`
      name: "jays-web",
      script: "node_modules/.bin/remix-serve",
      args: "build/server/index.js",
      instances: 2,
      exec_mode: "cluster",
      env_file: ".env",
      listen_timeout: 15000,
      kill_timeout: 5000,
    },
    {
      // graphile-worker background job processor
      // NOTE: start-worker.sh sources .env and runs graphile-worker with no args.
      // The -c flag in graphile-worker is for connection string, NOT crontab.
      // graphile-worker auto-discovers the crontab file from the working directory.
      name: "jays-worker",
      script: "start-worker.sh",
      interpreter: "sh",
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
