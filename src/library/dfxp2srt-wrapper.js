// external modules
let PythonShell = require("python-shell");
// internal modules
const fileManager = require("./file-manager");

/**
 * @description Extract raw text from dfxp files.
 * @param {String} slug - Identifier for videolectures.
 * @returns {Object} The promise.
 */
module.exports = function (slug, path = "./") {
    // contains promises waiting to be resolved
    let promises = [];
    const dfxpPath = `${path}/${slug[0]}/${slug}`;

    // execute on all files that contain .tx. in the name
    fileManager.executeOnFiles(dfxpPath, /\.dfxp/g, (filename) => {
        let promise = new Promise((resolve, reject) => {
            const options = {
                scriptPath: __dirname,
                args: [filename]
            };

            // get language of the dfxp
            const match = filename.match(/(\w{2})\.tx\.|(\w{2})\.tl\./);
            const lang = match[1] || match[2];

            // initialize process for running the python script
            PythonShell.run("./python/dfxp2txt.py", options, (error, results) => {
                if (error) { return reject(error); }
                let dfxp = fileManager.getFileContent(filename);
                let plain = results ? results.toString() : "";
                return resolve({ lang, dfxp, plain });
            });
        });
        // push the promise
        promises.push(promise);
    });

    return promises;
};
