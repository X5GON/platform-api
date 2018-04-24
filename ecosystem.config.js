module.exports = {
    apps : [{
      name: "X5GON_platform",
      script: "./src/server/server.js",
      cwd: "./src/server/",
      instances: 1,
      exec_mode: "cluster",
      autorestart: true
    }]
  }