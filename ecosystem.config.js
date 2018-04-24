module.exports = {
<<<<<<< HEAD
    apps: [{
        name: 'X5GON_platform',
        script: './src/server/platform/platform.js',
        cwd: './src/server/platform/',
        instances: '4',
        exec_mode: 'cluster',
        autorestart: true
    }]
};
=======
    apps : [{
      name: "X5GON_platform",
      script: "./src/server/server.js",
      cwd: "./src/server/",
      instances: 1,
      exec_mode: "cluster",
      autorestart: true
    }]
  }
>>>>>>> 51d6b7e83d3b23056223b1b0947fb076968a4aab
