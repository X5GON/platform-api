/** **********************************************
 * Winston Logger with
 * Winston Daily Rotate File Module
 * This module creates a logger which is able
 * to log activities and rotate them by day. In
 * addition, the log files are compressed after
 * a while.
 */

// module for path creation
const path = require("path");

// file management module
const fileManager = require("@library/file-manager");

// main logging modules
const {
    createLogger, format, transports, addColors
} = require("winston");
// add daily rotate file configuration
require("winston-daily-rotate-file");


// archive required modules
const fs = require("fs");
const archiver = require("archiver");

class Logger {
    /**
     * @description Prepares the logs folder.
     */
    constructor() {
        // set log folder path
        this.folder = path.join(__dirname, "../../logs/");
        // create log folder
        fileManager.createDirectoryPath(this.folder);
        // add colorization to console logs
        const colors = {
            info: "grey",
            warn: "yellow",
            error: "red"
        };
        addColors(colors);
    }

    /**
     * @description Creates a daily-rotate-file transport.
     * @param {String} fileName - The name of the the log files.
     * @param {String} path - The path to the log files.
     * @returns {Object} The Daily-rotate-file transport.
     * @private
     */
    _transportCreator(fileName, folderPath, level) {
        if (!fileName) {
            throw Error("Parameter 'fileName' not provided");
        }

        // create daily transport
        let transport = new (transports.DailyRotateFile)({
            filename: fileName,
            dirname: folderPath,
            datePattern: "YYYY-MM-DD",
            name: fileName,
            level,
            prepend: false,
            format: format.combine(
                format.timestamp(),
                format.json()
            )
        });

        function createFilename(level, year, month) {
            return `${year}-${month}-${level}`;
        }

        // action on rotate event
        transport.on("rotate", (oldFilename, newFilename) => {
            // get dates of the filenames
            const oldDate = oldFilename.split(".")[1].split("-");
            const newDate = newFilename.split(".")[1].split("-");
            // create a folder to store the old files (format: YYYY-MM)
            const monthFolderPath = path.join(folderPath, createFilename(level, oldDate[0], oldDate[1]));
            fileManager.createFolder(monthFolderPath);

            // move old file to the corresponding folder
            fileManager.moveFile(oldFilename, path.join(monthFolderPath, path.basename(oldFilename)));

            // if the months don't match; archive second-to-last month folder
            if (oldDate[1] !== newDate[1]) {
                // get second-to-last month and year
                let tempMonth = parseInt(oldDate[1]) - 1;

                const prevMonth = tempMonth === 0 ? 12 : tempMonth;
                const prevYear = prevMonth === 12 ? oldDate[0] - 1 : oldDate[0];

                // check if the second-to-last month folder exists
                const prevFolderPath = path.join(folderPath, createFilename(level, prevYear, (`0${prevMonth}`).slice(-2)));

                if (fs.existsSync(prevFolderPath)) {
                    // archive second-to-last log folders
                    // only the current and previous month logs are not archived
                    const output = fs.createWriteStream(`${prevFolderPath}.tar.gz`);

                    output.on("close", () => {
                        // archiver has finalized and the output file description has closed
                    });

                    output.on("end", () => {

                    });

                    // zip up the archive folders
                    let archive = archiver("tar", {
                        gzip: true,
                        gzipOptions: { level: 9 } // set the compression level
                    });

                    // set the output of the arhive
                    archive.pipe(output);

                    // catching warnings
                    archive.on("warning", (error) => {
                        if (error.code === "ENOENT") {
                            // logging errors
                        } else {
                            throw error;
                        }
                    });

                    archive.on("error", (error) => {
                        throw error;
                    });

                    // append files from the directory
                    archive.directory(prevFolderPath, false);
                    // finalize the archive and remove the original folder
                    archive.finalize()
                        .then(() => { fileManager.removeFolder(prevFolderPath); });
                }
            }
        });

        return transport;
    }

    /**
     * @description Create a logger instance.
     * @param {String} fileName - The name of the log file (the function adds a date pattern to the name).
     * @param {String} [level='info'] - The level of the logger instance.
     * @param {String} [subFolder=''] - The folder where the files are saved.
     * @param {Boolean} [consoleFlag=true] - Enable console logging.
     */
    createInstance(fileName, level = "info", subFolder = "", consoleFlag = true) {
        let logger_transports = [];
        // initialize folder path and create it
        let folderPath = path.join(this.folder, subFolder);
        fileManager.createDirectoryPath(folderPath);

        // add console logging transport to the instance
        if (consoleFlag) {
            logger_transports.push(new transports.Console({
                level,
                format: format.combine(
                    format.colorize(),
                    format.simple(),
                    format.timestamp()
                )
            }));
        }

        // add a file rotation transport
        logger_transports.push(this._transportCreator(fileName, folderPath, level));

        // create a logger instance
        let logger = createLogger({
            transports: logger_transports
        });

        // Add a function for creating the response object
        logger.formatRequest = this._formatRequest;

        // create a logger instance and return it
        return logger;
    }

    /**
     * @description Create a logger instance that write in three different files: `info`, `warn` and `error`.
     * @param {String} fileName - The name of the log file (the function adds a date pattern to the name).
     * @param {String} [subFolder=''] - The folder where the files are saved.
     * @param {Boolean} [consoleFlag=true] - Enable console logging.
     */
    createGroupInstance(fileName, subFolder = "", consoleFlag = true) {
        let logger_transports = [];
        // initialize folder path and create it
        let folderPath = path.join(this.folder, subFolder);
        fileManager.createDirectoryPath(folderPath);
        // add console logging transport to the instance
        if (consoleFlag) {
            logger_transports.push(new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.simple(),
                    format.timestamp()
                )
            }));
        }
        // add a file rotation transport for `info`, `warn` and `error`
        logger_transports.push(this._transportCreator(`${fileName}-info`, folderPath, "info"));
        logger_transports.push(this._transportCreator(`${fileName}-warn`, folderPath, "warn"));
        logger_transports.push(this._transportCreator(`${fileName}-error`, folderPath, "error"));

        // create a logger instance
        let logger = createLogger({
            transports: logger_transports
        });

        // Add a function for creating the response object
        logger.formatRequest = this._formatRequest;

        // create a logger instance and return it
        return logger;
    }

    /**
     * Add a function for creating the response object
     * @param {Object} request - The request object.
     */
    _formatRequest(request, extraParams = {}) {
        // get request parameters
        const {
            method, originalUrl, query, body, params
        } = request;
        // store the method request parameters
        let obj = {
            method,
            url: originalUrl
        };

        // add values if provided in the request
        if (Object.keys(query).length) { obj.query = query; }
        if (Object.keys(body).length) { obj.body = body; }
        if (Object.keys(params).length) { obj.params = params; }

        // join created object with the extra parameters
        return Object.assign(obj, extraParams);
    }
}

module.exports = new Logger();
