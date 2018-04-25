module.exports = {
    apps: [{
        name: 'X5GON_platform',
        script: 'platform.js',
        cwd: './src/server/platform/',
        instances: '4',
        exec_mode: 'cluster',
        autorestart: true
    }, {
        name: 'X5GON_recommender_engine',
        script: 'recsys.js',
        cwd: './src/server/recsys/',
        instances: '2',
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 10
    }]
};
