module.exports = {
  apps: [
    {
      name: "examforge-api",
      script: "apps/api/dist/main.js",
      exec_mode: "fork", // SSE 需要 fork 模式
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "examforge-web",
      script: "./web-server.js",
      exec_mode: "fork", // SSE 代理需要 fork 模式
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        WEB_PORT: 4173,
      },
    },
  ],
};
