module.exports = {
    apps: [{
        name: 'X5GON_platform',
        script: './src/server/platform/platform.js',
        cwd: './src/server/platform/',
        instances: '4',
        exec_mode: 'cluster',
        autorestart: true
    }]
};
