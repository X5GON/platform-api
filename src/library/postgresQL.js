/** **********************************************
 * PostgresQL Module
 * This module connect to the PostgresQL database
 * and allows execution of simple commands.
 */

// external libraries
const { Pool } = require("pg");
const Cursor = require("pg-cursor");

// async values handler
const async = require("async");

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
        self._pool.on("error", (error, client) => {
            // how to handle errors of the idle clients
            console.error("idle client error", error.message, error.stack);
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
        let keys = [];
        let values = [];

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
        let condition; let params = [];
        let limitOffset = { };
        if (conditions instanceof Array) {
            // get all conditions together
            let conditionKeys = [];
            for (let cond of conditions) {
                // extract the conditions and values, concat in an array
                let { index, keys, values } = self._extractKeysAndValues(cond, idx);
                conditionKeys.push(`(${keys.join(" AND ")})`);
                params = params.concat(values);
                idx = index;
            }
            // join the conditions
            condition = (conditionKeys.join(" OR "));
        } else {
            let { keys, values } = self._extractKeysAndValues(conditions, idx);
            if (keys === "limit" || keys === "offset") {
                limitOffset[keys] = values;
            } else {
                // join the conditions and prepare the params
                params = params.concat(values);
                condition = keys.join(" AND ");
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
        let keys = [];
        let params = [];

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
        if (callback && typeof (callback) === "function") {
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
            if (params.length == 0) {
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
            let cursor = params.length
                ? client.query(new Cursor(statement, params))
                : client.query(new Cursor(statement));

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
            .map((id) => `$${id + 1}`).join(",");

        // prepare the record values - sent with the query
        let params = [];
        for (let key of recordKeys) {
            params.push(record[key]);
        }
        // prepare the query command
        let query = `INSERT INTO ${table} (${recordKeys.join(",")}) VALUES
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

        let limitations = "";
        if (Object.keys(limitOffset).length) {
            limitations = Object.keys(limitOffset)
                .map((key) => `${key.toUpperCase()} ${limitOffset[key]}`)
                .join(" ");
        }

        // prepare the query command
        let query = params.length
            ? `SELECT * FROM ${table} WHERE ${condition} ${limitations};`
            : `SELECT * FROM ${table} ${limitations};`;

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
    selectLarge(conditions, table, batchSize, batchCallback, callback) {
        let self = this;

        // set the conditions and parameters
        let { condition, params } = self._getConditions(conditions, 1);
        // prepare the query command
        let query = params.length
            ? `SELECT * FROM ${table} WHERE ${condition};`
            : `SELECT * FROM ${table};`;

        // execute the query
        self.executeLarge(query, params, batchSize, batchCallback, callback);
    }

    /**
     * @description Counts the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    selectCount(conditions, table, callback) {
        let self = this;

        // set the conditions and parameters
        let { condition, params, limitOffset } = self._getConditions(conditions, 1);

        let limitations = "";
        if (Object.keys(limitOffset).length) {
            limitations = Object.keys(limitOffset)
                .map((key) => `${key.toUpperCase()} ${limitOffset[key]}`)
                .join(" ");
        }

        // prepare the query command
        let query = params.length
            ? `SELECT COUNT(*) FROM ${table} WHERE ${condition} ${limitations};`
            : `SELECT COUNT(*) FROM ${table} ${limitations};`;

        // execute the query
        return self.execute(query, params, callback);
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
        const query = `UPDATE ${table} SET ${keys.join(", ")} ${condition ? `WHERE ${condition}` : ""} RETURNING *;`;

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
        const query = `DELETE FROM ${table} ${condition ? `WHERE ${condition}` : ""} RETURNING *;`;

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
            .map((id) => `$${id + 1}`).join(",");

        // get the values used to update the records
        let { keys, params } = self._getValues(record, 1);

        // get the condition keys - must be UNIQUE
        let conditionKeys = Object.keys(conditions);
        if (conditionKeys.length > 1) {
            const error = new Error(`[PostgresQL upsert] Too many conditions ${conditionKeys.join(",")}`);
            return callback(error);
        }
        // create the query command
        const query = `INSERT INTO ${table} (${recordKeys.join(",")}) VALUES (${recordValIds})
           ON CONFLICT (${conditionKeys.join(", ")}) DO UPDATE SET ${keys.join(", ")} RETURNING *;`;

        // execute the query
        return self.execute(query, params, callback);
    }

    /** ********************************
     * X5GON specific queries
     ******************************** */

    /**
     * Fixes and formats the number to show its value in an abbriviated form.
     * @param {Number} number - The number to be formated.
     * @returns {String} The formated number.
     */
    _numberFormat(number) {
        // get the quotient of different values
        const billions = number / 1000000000;
        const millions = number / 1000000;
        const thousands = number / 1000;

        /**
         * Fixes the number based on its value.
         * @param {Number} number - The number to be fixed.
         * @returns {String} The fixed number.
         */
        function toFixed(number) {
            return number <= 10 ? number.toFixed(2)
                : number <= 100 ? number.toFixed(1)
                    : number.toFixed(0);
        }
        // format based on the quotient
        if (billions >= 1) {
            return `${toFixed(billions)}B`;
        } else if (millions >= 1) {
            return `${toFixed(millions)}M`;
        } else if (thousands >= 1) {
            return `${toFixed(thousands)}k`;
        } else {
            return number;
        }
    }

    /**
     * @description Gets the specific provider statistics.
     * @param {String[]|String} tokens - The providers unique tokens.
     * @param {Function} callback - The callback function.
     */
    selectProviderStats(tokens, callback) {
        let self = this;
        /**
         * Prepares the API key instance for consumption by formating the date_created
         * and permissions attributes.
         * @param {Object} instance - The API key object.
         * @returns {Object} The `instance` object with the prepared values.
         */
        function prepareOERProviders(instance) {
            // beautify the date created value
            instance.material_count = parseInt(instance.material_count || 0);
            instance.material_count_clean = self._numberFormat(instance.material_count);
            instance.visit_count = parseInt(instance.visit_count || 0);
            instance.visit_count_clean = self._numberFormat(instance.visit_count);

            // return the instance
            return instance;
        }

        // add token based contraint
        let constraint = "";
        if (Array.isArray(tokens)) {
            constraint = `WHERE providers.token IN (${tokens.join(",")})`;
        } else if (typeof tokens === "string") {
            constraint = `WHERE providers.token='${tokens}'`;
        }
        // create the query string
        const query = `
            WITH urls_count AS (
                SELECT
                    url_id,
                    COUNT(*) AS visit_count
                FROM user_activities
                WHERE cookie_id IS NOT NULL
                GROUP BY url_id
            ),
            provider_urls_count AS (
                SELECT
                    provider_id,
                    SUM(visit_count) AS visit_count_sum
                FROM urls
                LEFT JOIN urls_count ON urls.id=urls_count.url_id
                WHERE provider_id IS NOT NULL
                GROUP BY provider_id
            ),
            materials_per_provider_count AS (
                SELECT
                    provider_id,
                    COUNT(*) AS material_count
                FROM urls
                WHERE material_id IS NOT NULL
                GROUP BY provider_id
            ),
            urls_materials_count AS (
                SELECT
                    provider_urls_count.provider_id AS provider_id,
                    visit_count_sum,
                    material_count
                FROM materials_per_provider_count
                FULL OUTER JOIN provider_urls_count
                ON materials_per_provider_count.provider_id=provider_urls_count.provider_id
            )
            SELECT
                id,
                name,
                token,
                domain,
                contact,
                material_count,
                visit_count_sum AS visit_count
            FROM providers
            LEFT JOIN urls_materials_count
            ON providers.id=urls_materials_count.provider_id
            ${constraint};
        `;

        // execute the query
        return self.execute(query, [], (error, results) => {
            if (error) { return callback(error); }
            results.forEach(prepareOERProviders);
            return callback(null, results);
        });
    }
}

module.exports = function (config) {
    return new PostgreSQL(config);
};
