/** **********************************************
 * File Manager Module
 * This module contains methods for manipulating
 * with files and folders.
 */

// internal modules
const fs = require("fs");
const path = require("path");

/**
 * @description Removes the file.
 * @param {String} fileName - Name of the file to be removed.
 */
exports.removeFile = function (fileName) {
    // check if file exists
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    } else {
        throw Error(`File does not exist: ${fileName}`);
    }
};

/**
 * @description Removes the file.
 * @param {String} oldPath - Name of the file to be moved.
 * @param {String} newPath - New destination of the file.
 */
exports.moveFile = function (oldPath, newPath) {
    // check if file exists
    if (fs.existsSync(oldPath)) {
        // move the file to other folder
        fs.renameSync(oldPath, newPath);
    } else {
        throw Error(`File does not exist: ${oldPath}`);
    }
};

/**
 * @description Removes the folder and it's content.
 * @param {String} sourcePath - The folder to be removed.
 */
exports.removeFolder = function (sourcePath) {
    if (!fs.existsSync(sourcePath)) {
        console.log(`Folder does not exist: ${sourcePath}`);
        return;
    }

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
 * @description Copies the folder source to folder destination.
 * @param {String} source - The source folder.
 * @param {String} destination - The destination folder.
 */
exports.copyFolder = function (source, destination) {
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
 * @description Creates a directory.
 * @param {String} dirPath - Directory path.
 */
exports.createFolder = function (dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
};

/**
 * @description Creates all directories in path.
 * @param {String} dirPath - Directory path.
 */
exports.createDirectoryPath = function (dirPath) {
    // resolve path
    let resolvedPath = path.resolve(dirPath);
    // split to get it's directories
    let directories = resolvedPath.split(/[\/\\]/g);
    let currentDir = directories[0].length ? directories[0] : "/";
    // add and create directories in path
    for (let i = 1; i < directories.length; i++) {
        currentDir = path.join(currentDir, directories[i]);
        exports.createFolder(currentDir);
    }
};

/**
 * @description Find all files in a folder that follow a given rule and execute a method on them.
 * @param {String} startPath - The folder in which we search for files.
 * @param {RegExp} filter - A regular expression used to check file name.
 * @param {Function} callback - The function to execute on the file.
 */
exports.executeOnFiles = function (startPath, filter, callback) {
    // check if directory exists
    if (!fs.existsSync(startPath)) {
        throw new Error(`directory given by startPath does not exist: ${startPath}`);
    }

    // get all file names and iterate through
    let files = fs.readdirSync(startPath);
    for (let file of files) {
        let filename = path.join(startPath, file);
        let stat = fs.lstatSync(filename);

        // check if file is a directory
        if (stat.isDirectory()) {
            // recursive check if it contains files
            exports.executeOnFiles(filename, filter, callback);
        }
        // if file name matches the filter - execute callback
        else if (file.match(filter)) { callback(filename); }
    }
};

/**
 * @description Return the content of the given file.
 * @param {String} filePath - The file to be read.
 * @returns {String} The content of the file.
 */
exports.getFileContent = function (filePath) {
    // check if file exists
    if (!fs.existsSync(filePath)) {
        throw Error(`file does not exist: ${filePath}`);
    }
    // read the file and return it's content
    return fs.readFileSync(filePath, "utf8");
};
