// external modules
const spawn = require('child_process').spawn;
// internal modules
const fileManager = require('./file-manager');

/**
 * Extract raw text from dfxp files.
 * @param {String} slug - Identifier for videolectures.
 * @returns {Object} The promise.
 */
module.exports = function (slug, path='./') {

    // contains promises waiting to be resolved
    let promises = [];
    const dfxpPath = `${path}/${slug[0]}/${slug}`;
    // execute on all files that contain .tx. in the name
    fileManager.executeOnFiles(dfxpPath, /.tx./g, (filename) => {
        let promise = new Promise((resolve, reject) => {
            // initialize process for running the python script
            let process = spawn('python', [
                __dirname + '/dfxp2srt.raw.py',
                filename
            ]);
            // handle responses from the process
            process.stdout.on('data', data => { resolve(data.toString()); });
            process.stdout.on('error', error => { reject(error); });
        });
        // push the promise 
        promises.push(promise);
    });
    // return the promise with the given resolutions
    return Promise.all(promises);
};
