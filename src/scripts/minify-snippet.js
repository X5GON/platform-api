// external modules
const compressor = require('node-minify');

// compress the x5gon-log file - minifying the file size
// that is served to the client gui
compressor.minify({
    compressor: 'gcc',
    input: '../server/public/js/x5gon-log.js',
    output: '../server/public/js/x5gon-log.min.js',
    callback: function (err, min) { }
});