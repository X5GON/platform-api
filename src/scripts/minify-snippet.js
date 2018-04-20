// external modules
const compressor = require('node-minify');

// compress the x5gon-log file - minifying the file size
// that is served to the client gui


const minifyPaths= [
    // latest snippets
    'snippet/global/latest',
    'snippet/on-premise/latest',

    // version 1 snippets
    'snippet/global/v1',
    'snippet/on-premise/v1'
];

for (let path of minifyPaths) {
    compressor.minify({
        compressor: 'gcc',
        input: `../server/public/${path}/x5gon-log.js`,
        output: `../server/public/${path}/x5gon-log.min.js`,
        callback: function (err, min) { }
    });
}
