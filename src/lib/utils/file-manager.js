// internal modules
const fs = require('fs');
const path = require('path');

/**
 * Removes the file.
 * @param {String} fileName - Name of the file to be removed.
 */
exports.removeFile = function(fileName) {
    // check if file exists
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    } else {
        console.warn(`File does not exist: ${fileName}`);
    }
};

/**
 * Removes the folder and it's content.
 * @param {String} sourcePath - The folder to be removed.
 */
exports.removeFolder = function (sourcePath) {
    let source = path.resolve(sourcePath);
    // ensure to clean up the database after the tests
    if (fs.existsSync(source)) {
        // get all file names in the directory and iterate through them
        let files = fs.readdirSync(source);
        for (let file of files) {
            let fileName = path.join(source, file);
            let stat = fs.lstatSync(fileName);
            // check if file is a directory
            if (stat.isDirectory()) {
                // recursively remove folder
                exports.removeFolder(fileName);
            } else {
                exports.removeFile(fileName);
            }
        }
        // remove the folder
        fs.rmdirSync(source);
    }
};

/**
 * Copies the folder source to folder destination.
 * @param {String} source - The source folder.
 * @param {String} destination - The destination folder.
 */
exports.copyFolder = function(source, destination) {
    // check if source exists
    if (!fs.existsSync(source)) {
        throw new Error(`ParamError: source not exists ${source}`);
    }
    // check if destination exists
    if (!fs.existsSync(destination)) {
        exports.createDirectoryPath(destination);
    }
    // get all file names in the directory and iterate through them
    let files = fs.readdirSync(source);
    for (let file of files) {
        let fileName = path.join(source, file);
        let destinationFileName = path.join(destination, file);
        let stat = fs.lstatSync(fileName);
        // check if file is a directory
        if (stat.isDirectory()) {
            // recursive check if it contains files
            exports.copyFolder(fileName, destinationFileName);
        } else {
            let readFile = fs.createReadStream(fileName);
            let writeFile = fs.createWriteStream(destinationFileName);
            readFile.pipe(writeFile);
        }
    }
};

/**
 * Creates a directory.
 * @param {String} dirPath - Directory path.
 */
exports.createFolder = function(dirPath) {
    if (!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath);
    }
};

/**
 * Creates all directories in path.
 * @param {String} dirPath - Directory path.
 */
exports.createDirectoryPath = function(dirPath) {
    // resolve path
    let resolvedPath = path.resolve(dirPath);
    // split to get it's directories
    let directories = resolvedPath.split(/[\/\\]/g);
    let currentDir = directories[0].length ? directories[0] : '/';
    // add and create directories in path
    for (let i = 1; i < directories.length; i++) {
        currentDir = path.join(currentDir,directories[i]);
        exports.createFolder(currentDir);
    }
};