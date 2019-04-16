// external libraries
const { Pool } = require('pg');
const Cursor = require('pg-cursor');

// async values handler
const async = require('async');

/**
 * The postgresql wrapper class.
 */
class PostgreSQL {

    /**
     * @description Initialize postgresql pool connections.
     * @param {Object} config - The postgres config object.
     * @param {String} config.user - The user logging in.
     * @param {String} config.database - The database name.
     * @param {String} config.password - The password the user used to log in.
     * @param {String} config.host - Domain host/where to find postgres database.
     * @param {String} config.port - Host port.
     * @param {String} config.max - Maximum number of connections it can handle.
     * @param {String} config.idleTimeoutMillis - Duration the connection is established before idle.
     */
    constructor(config) {
        // save the configuration file
        this._config = config;
        // initilizes client pool
        this._initializePool();
    }

    /**
     * @description Initializes client pool used for connecting to the database.
     * @private
     */
    _initializePool() {
        let self = this;
        // create a pool of connections
        self._pool = new Pool(self._config);
        // put event handler
        self._pool.on('error', (error, client) => {
            // how to handle errors of the idle clients
            console.error('idle client error', error.message, error.stack);
            // TODO: expect the client - find a possible reason for exit
        });
    }

    /**
     * @description Extracts the keys and values used for querying.
     * @param {Object} params - The object containing the parameters.
     * @param {Number} index - The index from where to label the parameters.
     * @returns {Object} Containing the query parameters, values and the number of query parameters.
     * @private
     */
    _extractKeysAndValues(params, index) {
        // prepare query and params
        let keys = [],
            values = [];

        // iterate thorugh the parameters
        for (let key in params) {
            // check if key-value is object
            if (params[key] instanceof Object) {
                // iterate through the object keys to create a query
                for (let kkey in params[key]) {
                    keys.push(`${key}->>'${kkey}'=$${index}`); index++;
                    values.push(params[key][kkey]);
                }
            } else {
                // the key-values are primary values
                keys.push(`${key}=$${index}`); index++;
                values.push(params[key]);
            }
        }
        // return the key-values
        return { keys, values, index };
    }

    /**
     * @description Extracts the condition rules.
     * @param {Object | Object[]} conditions - The conditions used after the WHERE statement.
     * @param {Number} idx - The starting number for parameter indexing.
     * @returns {Object} Containing the conditions and the statement values.
     * @private
     */
    _getConditions(conditions, idx) {
        let self = this;
        let condition, params = [],
            limitOffset = { };
        if (conditions instanceof Array) {
            // get all conditions together
            let conditionKeys = [ ];
            for (let cond of conditions) {
                // extract the conditions and values, concat in an array
                let { index, keys, values } = self._extractKeysAndValues(cond, idx);
                conditionKeys.push(`(${keys.join(' AND ')})`);
                params = params.concat(values);
                idx = index;
            }
            // join the conditions
            condition = (conditionKeys.join(' OR '));
        } else {
            let { keys, values } = self._extractKeysAndValues(conditions, idx);
            if (keys === 'limit' || keys === 'offset') {
                limitOffset[keys] = values;
            } else {
                // join the conditions and prepare the params
                params = params.concat(values);
                condition = keys.join(' AND ');
            }
        }
        return { condition, params, limitOffset };
    }

    /**
     * @description Creates an object of keys, parameter values, and the current index.
     * @param {Object} values - The values object.
     * @param {Number} index - The starting index.
     * @returns {Object} The object containing the extracted keys, parameters and index.
     * @private
     */
    _getValues(values, index) {
        // prepare query and params
        let keys = [],
            params = [];

        // check what are the conditions
        for (let key in values) {
            // the key-values are primary values
            keys.push(`${key}=$${index}`); index++;
            params.push(values[key]);
        }
        // return the key-values and the index
        return { keys, params, index };
    }

    /**
     * @description Closes the pool connections.
     * @returns {Null}
     */
    close(callback) {
        let self = this;
        if (callback && typeof(callback) === 'function') {
            self._pool.end().then(callback);
        } else {
            self._pool.end();
        }
    }

    /**
     * @description Executes the query given the values.
     * @param {String} statement - The query statement.
     * @param {Array} params - The actual values used in the statement.
     * @param {Function} callback - The callback function.
     */
    execute(statement, params, callback) {
        let self = this;
        self._pool.connect((error, client, release) => {
            if (error) { release(); return callback(error); }

            // execute statement
            if (params.length == 0){
                client.query(statement, (xerror, results) => {
                    // once we get the results we release the client
                    release();
                    // handle possible errors and get the results
                    if (xerror) { return callback(xerror); }
                    let rows = results ? results.rows : [];
                    // return the results to the user
                    if (callback) return callback(null, rows);
                });
            } else {
                client.query(statement, params, (xerror, results) => {
                    // once we get the results we release the client
                    release();
                    // handle possible errors and get the results
                    if (xerror) { return callback(xerror); }
                    let rows = results ? results.rows : [];
                    // return the results to the user
                    if (callback) return callback(null, rows);
                });
            }
        });
    }

    /**
     * @description Executes the query given the values.
     * @param {String} query - The query statement.
     * @param {Array} params - The values used in the statement.
     * @param {Integer} batchSize - The size of the result returns at oance
     * @param {Function} callback - The callback function.
     */
    executeLarge(statement, params, batchSize, batchCallback, callback) {
        let self = this;
        // make a connection with the pool
        self._pool.connect((error, client, release) => {
            if (error) { release(); return callback(error); }

            // create a cursor - with or without the parameters provided
            let cursor = params.length ?
                client.query(new Cursor(statement, params)) :
                client.query(new Cursor(statement));

            // until the last batch is of full batch-size, continue the process
            let lastBatch = batchSize;

            /**
             * This function designates what to do with the values read by the cursor.
             * @param {Function} xcallback - The async callback.
             * @private
             */
            function _batchFunction(xcallback) {
                cursor.read(batchSize, (xerror, rows) => {
                    if (xerror) {
                        lastBatch = 0;
                        return xcallback(xerror);
                    } else {
                        lastBatch = rows.length;
                        if (rows.length > 0 && batchCallback) {
                            // activate the batch callback function
                            return batchCallback(null, rows, xcallback);
                        } else if (batchCallback) {
                            return batchCallback(null, [], xcallback);
                        }
                    }
                });
            }

            /**
             * The final async callback.
             * @param {Object} error - The possible error created during the async process.
             * @private
             */
            function _batchFinalFunction(error) {
                cursor.close(() => { release(); return callback(error); });
            }

            // start processing records in postgres
            async.whilst(
                () => batchSize === lastBatch,
                _batchFunction,
                _batchFinalFunction
            );
        });
    }

    /**
     * @description Inserts the object in the database.
     * @param {Object} record - The object containing the keys and values.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    insert(record, table, callback) {
        let self = this;
        // get the record keys and values
        const recordKeys = Object.keys(record);
        const recordValIds = [...Array(recordKeys.length).keys()]
                            .map((id) => '$'+(id+1)).join(',');

        // prepare the record values - sent with the query
        let params = [];
        for (let key of recordKeys) {
            params.push(record[key]);
        }
        // prepare the query command
        let query = `INSERT INTO ${table} (${recordKeys.join(',')}) VALUES
            (${recordValIds}) RETURNING *;`;

        // execute the query
        return self.execute(query, params, callback);
    }

    /**
     * @description Finds the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    select(conditions, table, callback) {
        let self = this;

        // set the conditions and parameters
        let { condition, params, limitOffset } = self._getConditions(conditions, 1);

        let limitations = '';
        if (Object.keys(limitOffset).length) {
            limitations = Object.keys(limitOffset)
                .map(key => `${key.toUpperCase()} ${limitOffset[key]}`)
                .join(' ');
        }

        // prepare the query command
        let query = params.length ?
            `SELECT * FROM ${table} WHERE ${condition} ${limitations};` :
            `SELECT * FROM ${table} ${limitations};`;

        // execute the query
        return self.execute(query, params, callback);
    }

    /**
     * @description Finds the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Integer} batchSize - The size of the result returnes at once
     * @param {Function} callback - The callback function.
     */
    selectLarge(conditions, table, batchSize,  batchCallback, callback) {
        let self = this;

        // set the conditions and parameters
        let { condition, params } = self._getConditions(conditions, 1);
        // prepare the query command
        let query = params.length ?
            `SELECT * FROM ${table} WHERE ${condition};` :
            `SELECT * FROM ${table};`;

        // execute the query
        self.executeLarge(query, params, batchSize, batchCallback, callback);
    }

    /**
     * @description Updates the rows in the database.
     * @param {Object} values - The values used for updating the rows.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    update(values, conditions, table, callback) {
        let self = this;

        // get the values used to update the records
        const { keys, params: updateParams, index } = self._getValues(values, 1);
        // get conditions and associated values
        const { condition, params: conditionParams } = self._getConditions(conditions, index);
        // get joint parameters
        const params = updateParams.concat(conditionParams);
        // prepare query and params
        const query = `UPDATE ${table} SET ${keys.join(', ')} ${condition ? `WHERE ${condition}` : ''} RETURNING *;`;

        // execute the query
        return self.execute(query, params, callback);
    }

    /**
     * @description Deletes the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    delete(conditions, table, callback) {
        let self = this;

        // get the conditions and prepare the query
        let { condition, params } = self._getConditions(conditions, 1);
        const query = `DELETE FROM ${table} ${condition ? `WHERE ${condition}` : ''} RETURNING *;`;

        // execute the query
        return self.execute(query, params, callback);
    }

    /**
     * @description Upserts (updates or inserts) the row in the database.
     * @param {Object} record - The values of the row.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    upsert(record, conditions, table, callback) {
        let self = this;

        // get the record keys and values
        const recordKeys = Object.keys(record);
        const recordValIds = [...Array(recordKeys.length).keys()]
                            .map(id => '$'+(id+1)).join(',');

        // get the values used to update the records
        let { keys, params } = self._getValues(record, 1);

        // get the condition keys - must be UNIQUE
        let conditionKeys = Object.keys(conditions);
        if (conditionKeys.length > 1) {
            const error = new Error(`[PostgresQL upsert] Too many conditions ${conditionKeys.join(',')}`);
            return callback(error);
        }
        // create the query command
        const query = `INSERT INTO ${table} (${recordKeys.join(',')}) VALUES (${recordValIds})
           ON CONFLICT (${conditionKeys.join(', ')}) DO UPDATE SET ${keys.join(', ')} RETURNING *;`;

        // execute the query
        return self.execute(query, params, callback);
    }
}

module.exports = function (config) {
    return new PostgreSQL(config);
};
