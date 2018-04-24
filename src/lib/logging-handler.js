// external modules
const winston = require('winston');
const path = require('path');
// internal modules
const fileManager = require('./file-manager');

// add daily rotate file configuration
require('winston-daily-rotate-file');

class Logger {

    /**
     * Prepares the logs folder.
     */
    constructor() {
        // set log folder path
        this.folder = path.join(__dirname, '../../logs/');
        // create log folder
        fileManager.createDirectoryPath(this.folder);
        // prepare level colorization
        const colors = { info: 'grey', warn: 'yellow', error: 'red' };
        winston.addColors(colors);
    }

    /**
     * Creates a daily-rotate-file transport.
     * @param {String} fileName - The name of the the log files.
     * @param {String} path - The path to the log files.
     * @returns {Object} The Daily-rotate-file transport.
     * @private
     */
    _transportCreator(fileName, folderPath, level) {
        return new (winston.transports.DailyRotateFile)({
            filename: path.join(folderPath, fileName),
            datePattern: '.yyyy-MM-dd',
            name: fileName,
            level: level,
            prepend: false
        });
    }

    /**
     * Create a logger instance.
     * @param {String} fileName - The name of the log file (the function adds a date pattern to the name).
     * @param {String} [level='info'] - The level of the logger instance.
     * @param {String} [subFolder=''] - The folder where the files are saved.
     * @param {Boolean} [consoleFlag=true] - Enable console logging.
     */
    createInstance(fileName, level='info', subFolder='', consoleFlag=true) {
        let logger_transports = [];
        // initialize folder path and create it
        let folderPath = path.join(this.folder, subFolder);
        fileManager.createDirectoryPath(folderPath);
        // add console logging transport to the instance
        if (consoleFlag) { logger_transports.push(new (winston.transports.Console)({ level, colorize: true })); }
        // add a file rotation transport
        logger_transports.push(this._transportCreator(fileName, folderPath, level));

        // create a logger instance
        let logger = new (winston.Logger)({ transports: logger_transports });

        /**
         * Add a function for creating the reponse object
         * @param {Object} request - The request object.
         */
        logger.formatRequest = function (request, additionalParams = {}) {
            return Object.assign({
                method:   request.method,
                url:      request.originalUrl,
                query:    request.query,
                body:     request.body,
                params:   request.params
            }, additionalParams);
        };

        // create a logger instance and return it
        return logger;
    }

    /**
     * Create a logger instance that write in three different files: `info`, `warn` and `error`.
     * @param {String} fileName - The name of the log file (the function adds a date pattern to the name).
     * @param {String} [subFolder=''] - The folder where the files are saved.
     * @param {Boolean} [consoleFlag=true] - Enable console logging.
     */
    createGroupInstance(fileName, subFolder='', consoleFlag=true) {
        let logger_transports = [];
        // initialize folder path and create it
        let folderPath = path.join(this.folder, subFolder);
        fileManager.createDirectoryPath(folderPath);
        // add console logging transport to the instance
        if (consoleFlag) { logger_transports.push(new (winston.transports.Console)({ level: 'info', colorize: true })); }
        // add a file rotation transport for `info`, `warn` and `error`
        logger_transports.push(this._transportCreator(`${fileName}-info`,  folderPath, 'info'));
        logger_transports.push(this._transportCreator(`${fileName}-warn`,  folderPath, 'warn'));
        logger_transports.push(this._transportCreator(`${fileName}-error`, folderPath, 'error'));

        // create a logger instance
        let logger = new (winston.Logger)({ transports: logger_transports });

        /**
         * Add a function for creating the reponse object
         * @param {Object} request - The request object.
         */
        logger.formatRequest = function (request, additionalParams = {}) {
            return Object.assign({
                method:   request.method,
                url:      request.originalUrl,
                query:    request.query,
                body:     request.body,
                params:   request.params
            }, additionalParams);
        };

        // create a logger instance and return it
        return logger;
    }
}

module.exports = function () {
    return new Logger();
};
