module.exports = {
    apps: [{
        name: 'X5GON_platform',
        script: 'platform.js',
        cwd: './src/server/platform/',
        node_args: '--session-secret=keyboardcatz',
        instances: '4',
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 20
    }, {
        name: 'X5GON_recommender_engine',
        script: 'recsys.js',
        cwd: './src/server/recsys/',
        instances: '1',
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 10
    }]
};
