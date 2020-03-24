
class PGRecords {
    constructor(config, sql_statement, time_interval) {
        // the record container
        this._data = [];
        // esablish connection with database
        this._pg = require("@library/postgresQL")(config);
        // store the SQL statement for future use
        this._sqlStatement = sql_statement;
        // store the interval value for continuous retrieval
        this._time_interval = time_interval;
        // the interval object
        this._interval = null;
    }

    enable() {
        let self = this;
        if (!self._interval) {
            self._interval = setInterval(() => {
                self._getMaterialMetadata();
            }, self._time_interval);
            self._getMaterialMetadata();
        }
    }

    disable() {
        if (this._interval) {
            clearInterval(this._interval);
        }
    }

    next() {
        if (this._data.length > 0) {
            let record = this._data[0];
            this._data = this._data.splice(1);
            return record;
        } else {
            return null;
        }
    }

    stop(callback) {
        // disable interval
        this.disable();
        // close pg connection
        this._pg.close(callback);
    }


    _getMaterialMetadata() {
        let self = this;
        self._pg.execute(self._sqlStatement, [], (error, records) => {
            if (error) { return; }
            records.forEach((record) => {
                self._data.push(record);
            });
        });
    }
}


/**
 * @class PostgresqlSpout
 * @description Periodically retrieves the records from the postgreql table
 * and sends it to the
 */
class PostgresqlSpout {
    constructor() {
        this._name = null;
        this._context = null;
        this._prefix = "";
        this._generator = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._prefix = `[PostgresqlSpout ${this._name}]`;
        this._generator = new PGRecords(
            config.pg,
            config.sql_statement,
            config.time_interval
        );
        callback();
    }

    heartbeat() {
    }

    shutdown(callback) {
        this._generator.stop(callback);
    }

    run() {
        this._generator.enable();
    }

    pause() {
        this._generator.disable();
    }

    next(callback) {
        callback(null, this._generator.next(), null, callback);
    }
}

exports.create = function () {
    return new PostgresqlSpout();
};
