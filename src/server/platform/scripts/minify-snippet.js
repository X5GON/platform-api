/**
 * Compress the x5gon-log file - minifying the file size
 * that is served to the client UI
 */

// external modules
const compressor = require('node-minify');

const minifyPaths= [
    // latest snippets
    'global/latest',
    'on-premise/latest',

    // version 1 snippets
    'global/v1',
    'on-premise/v1',

    // version 2 snippets
    'global/v2',
    'on-premise/v2'
];

for (let path of minifyPaths) {
    compressor.minify({
        compressor: 'gcc',
        input: `../snippet/${path}/x5gon-log.js`,
        output: `../snippet/${path}/x5gon-log.min.js`,
        callback: function (err, min) { }
    });
}
