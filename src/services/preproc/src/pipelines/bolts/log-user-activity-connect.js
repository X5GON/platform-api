/** ******************************************************************
 * Material Format Component
 * This component receives the OER material in its raw form and it
 * formats into a common schema.
 */

const Logger = require("@library/logger");

/**
 * Formats Material into a common schema.
 */
class LoggerUserActivityConnect {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[LoggerUserActivityConnect ${this._name}]`;

        const {
            file_name,
            level,
            sub_folder
        } = config;

        // initialize the logger
        this._logger = Logger.createInstance(file_name, level, sub_folder, false);

        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    receive(message, stream_id, callback) {
        // do not change any requests and log the message
        this._logger.info("user_activity", message);

        // send the formatted material to next component
        return callback(null);
    }
}

exports.create = function (context) {
    return new LoggerUserActivityConnect(context);
};
