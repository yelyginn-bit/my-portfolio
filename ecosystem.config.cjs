module.exports = {
  apps: [
    {
      name: "yelyginn-site",
      script: "server/production-server.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
