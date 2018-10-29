// external libraries
const pg = require('pg');
const Cursor = require('pg-cursor');
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
        this.config = config;
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
        self.pool = new pg.Pool(self.config);
        // put event handler
        self.pool.on('error', (err) => {
            // how to handle errors of the idle clients
            console.error('idle client error', err.message, err.stack);
        });
    }

    /**
     * @description Extracts the keys and values used for querying.
     * @param {Object} obj - The object containing the parameters.
     * @returns {Object} Containing the query parameters, values and the number of query parameters.
     * @private
     */
    _extractKeysAndValues(obj, i) {
        // prepare query and params
        let queryVal = [],
            params = [];
        // check what are the conditions
        for (let key in obj) {
            // check if key-value is object
            if (obj[key] instanceof Object) {
                for(let kkey in obj[key]) {
                    queryVal.push(`${key}->>'${kkey}'=$${i}`); i++;
                    params.push(obj[key][kkey]);
                }
            } else {
                // the key-values are primary values
                queryVal.push(`${key}=$${i}`); i++;
                params.push(obj[key]);
            }
        }
        // return the key-values
        return { keys: queryVal, values: params, i: i };
    }

    /**
     * @description Extracts the condition rules.
     * @param {Object | Object[]} conditions - The conditions used after the WHERE statement.
     * @param {Number} i - The starting number for parameter indexing.
     * @returns {Object} Containing the conditions and the statement values.
     * @private
     */
    _getConditions(conditions, i) {
        let self = this;
        let fCond, params = [];
        if (conditions instanceof Array) {
            // get all conditions together
            let conditionKeys = [ ];
            for (let cond of conditions) {
                // extract the conditions and values, concat in an array
                let eCond = self._extractKeysAndValues(cond, i); i = eCond.i;
                conditionKeys.push(`(${eCond.keys.join(' AND ')})`);
                params = params.concat(eCond.values);
            }
            // join the conditions
            fCond = (conditionKeys.join(' OR '));
        } else {
            let eCond = self._extractKeysAndValues(conditions, i);
            // join the conditions and prepare the params
            fCond = eCond.keys.join(' AND ');
            params = params.concat(eCond.values);
        }
        return { condition: fCond, params };
    }

    _getValues(values, i) {
        // prepare query and params
        let queryVal = [],
            params = [];
        // check what are the conditions
        for (let key in values) {
            // the key-values are primary values
            queryVal.push(`${key}=$${i}`); i++;
            params.push(values[key]);
        }
        // return the key-values
        return { keys: queryVal, params, i: i };
    }

    /**
     * @description Closes the connections.
     * @returns {Null}
     */
    close(callback) {
        let self = this;
        if (callback && typeof(callback) === 'function') {
            self.pool.end().then(callback);
        } else {
            self.pool.end();
        }
    }

    /**
     * @description Executes the query given the values.
     * @param {String} query - The query statement.
     * @param {Array} params - The values used in the statement.
     * @param {Function} callback - The callback function.
     */
    execute(statement, params, callback) {
        let self = this;
        self.pool.connect((err, client, done) => {
            if (err) {
                console.log(err);
                callback(err);
            }
            // execute statement
            if (params.length == 0){
                client.query(statement, (err, results) => {
                    done(err);
                    if (err) { console.log(err); }
                    let res = results ? results.rows : [];
                    // release the client
                    if (callback) { callback(err, res); }
                });
            } else {
                client.query(statement, params, (err, results) => {
                    done(err);
                    if (err) { console.log(err); }
                    let res = results ? results.rows : [];
                    // release the client
                    if (callback) { callback(err, res); }
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
        self.pool.connect((err, client, done) => {
            if (err) {
                console.log(err);
                callback(err);
            }
            // execute statement
            let cursor;
            if (params.length == 0){
                cursor = client.query(new Cursor(statement));
            } else {
                cursor = client.query(new Cursor(statement, params));
            }
            let lastBatch = batchSize;
            async.whilst(
                () => { return (batchSize == lastBatch); },
                (xcallback) => {
                    cursor.read(batchSize, (err, rows) => {
                        if (err) {
                            lastBatch = 0;
                        } else {
                            lastBatch = rows.length;
                            if (rows.length > 0 && batchCallback) {
                                batchCallback(null, rows);
                            }
                        }
                        xcallback(err);
                    });
                },
                (err) => {
                    cursor.close(() => {
                        done(); callback(err);
                    });
                }
            );
        });
    }

    /**
     * @description Inserts the object in the database.
     * @param {Object} values - The object containing the keys and values.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    insert(values, table, callback) {
        let self = this;
        // get the object keys
        let keys = Object.keys(values);
        // prepare query and params
        let query = `INSERT INTO ${table}(${keys.join(',')}) VALUES
            (${[...Array(keys.length).keys()].map((id) => '$'+(id+1)).join(',')}) RETURNING *`;
        let params = [];
        for (let key of keys) { params.push(values[key]); }
        self.execute(query, params, callback);
    }

    /**
     * @description Finds the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    select(conditions, table, callback) {
        let self = this;
        let { condition, params } = self._getConditions(conditions, 1);
        let query;
        if (params.length == 0) {
            query = `SELECT * FROM ${table}`;
        } else {
            query = `SELECT * FROM ${table} WHERE ${condition}`;
        }
        self.execute(query, params, callback);
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
        let { condition, params } = self._getConditions(conditions, 1);
        let query;
        if (params.length == 0) {
            query = `SELECT * FROM ${table}`;
        } else {
            query = `SELECT * FROM ${table} WHERE ${condition}`;
        }
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
        let eValues = self._getValues(values, 1);
        // get conditions
        let { condition, params } = self._getConditions(conditions, eValues.i);
        params = eValues.params.concat(params);

        // prepare query and params
        let query = `UPDATE ${table} SET ${eValues.keys.join(', ')} WHERE ${condition} RETURNING *`;
        self.execute(query, params, callback);
    }

    /**
     * @description Deletes the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    delete(conditions, table, callback) {
        let self = this;
        // get the conditions
        let { condition, params } = self._getConditions(conditions, 1);
        let query = `DELETE FROM ${table} WHERE ${condition}`;
        // run query
        self.execute(query, params, callback);
    }

    /**
     * @description Upserts (updates or inserts) the row in the database.
     * @param {Object} values - The values of the row.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    upsert(values, conditions, table, callback) {
        let self = this;
        // get the object keys
        let keys = Object.keys(values);
        // get the values used to update the records
        // get conditions
        let eValues = self._getValues(values, 1);

        let conditionKeys = Object.keys(conditions);
        if (conditionKeys.length > 1) {
            console.log(`Error in postgresQL.js, too many conditions ${conditions}.`);
            callback();
        }
        let query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${[...Array(keys.length).keys()].map((id) => '$'+(id+1)).join(',')})
           ON CONFLICT (${conditionKeys}) DO UPDATE SET ${eValues.keys.join(', ')}`;
        // run query
        self.execute(query, eValues.params, callback);
    }
}

module.exports = function (config) {
    return new PostgreSQL(config);
};
