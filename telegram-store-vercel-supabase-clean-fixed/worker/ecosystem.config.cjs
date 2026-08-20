module.exports = {
  apps: [
    {
      name: 'ilink-userbot-worker',
      script: './userbot-worker.js',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
