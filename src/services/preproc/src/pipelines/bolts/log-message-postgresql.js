/** ******************************************************************
 * Logging Message to PostgresQL
 * This component receives the message and logs the status into
 * the provided PostgreSQL table (with the provided attributes).
 */

// basic bolt template
const BasicBolt = require("./basic-bolt");

class LogMessagePostgreSQL extends BasicBolt {
    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePostgreSQL ${this._name}]`;

        // create the postgres connection
        this._pg = require("@library/postgresQL")(config.pg);

        this._postgresTable = config.postgres_table;
        this._postgresMethod = config.postgres_method || "update";
        this._postgresPrimaryId = config.postgres_primary_id;
        this._messagePrimaryId = config.message_primary_id;

        this._postgresMessageAttrs = config.postgres_message_attrs || null;
        this._postgresTimeAttrs = config.postgres_time_attrs || null;
        this._postgresLiteralAttrs = config.postgres_literal_attrs || null;

        this._finalBolt = config.final_bolt || false;

        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        this._pg.close(callback);
    }

    receive(message, stream_id, callback) {
        let self = this;

        // /////////////////////////////////////////
        // PREPARE THE UPDATE AND PRIMARY ATTRS
        // /////////////////////////////////////////

        const primaryAttrs = {
            [self._postgresPrimaryId]: self.get(message, self._messagePrimaryId)
        };

        // add the primary key to the update attributes (required to update the records)
        let updateAttrs = {
            [self._postgresPrimaryId]: self.get(message, self._messagePrimaryId)
        };

        if (this._postgresMessageAttrs) {
            // populate the update attributes with the message values
            for (let attr in self._postgresMessageAttrs) {
                updateAttrs[attr] = self.get(message, self._postgresMessageAttrs[attr]);
            }
        }

        if (this._postgresTimeAttrs) {
            // populate the update attributes with the given time values
            for (let time in self._postgresTimeAttrs) {
                updateAttrs[time] = (new Date()).toISOString();
            }
        }

        if (this._postgresLiteralAttrs) {
            // populate the update attributes with the given values
            for (let attr in self._postgresLiteralAttrs) {
                updateAttrs[attr] = self._postgresLiteralAttrs[attr];
            }
        }


        // /////////////////////////////////////////
        // UPDATE THE RECORD
        // /////////////////////////////////////////

        // update the record attributes with the given attributes
        self._pg[this._postgresMethod](updateAttrs, primaryAttrs, self._postgresTable, (error, result) => {
            if (error) {
                // update the message with the error
                this.set(message, self._documentErrorPath, error.message);
                if (self.final_bolt) { return callback(error); }
                return this._onEmit(message, "stream_error", callback);
            }
            if (self.final_bolt) { return callback(); }
            return this._onEmit(message, stream_id, callback);
        });
    }
}

exports.create = function (context) {
    return new LogMessagePostgreSQL(context);
};
