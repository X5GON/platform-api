/** **********************************************
 * PostgresQL Module
 * This module connect to the PostgresQL database
 * and allows execution of simple commands.
 */

// modules
const pg = require("pg");
const Cursor = require("pg-cursor");
const async = require("async");

class PostgreSQL {
    // initialize postgresql connection instance
    constructor(config) {
        // save the configuration file
        this._config = config;
        // initilizes client pool
        this._initializePool();
    }

    // closes the connections
    async close() {
        return await this._pool.end();
    }

    // initialize pool and establish connections
    _initializePool() {
        // create a pool of connections
        this._pool = new pg.Pool(this._config);
        // put event handler
        this._pool.on("error", (error, client) => {
            // how to handle errors of the idle clients
            console.error("idle client error", error.message, error.stack);
            // TODO: expect the client - find a possible reason for exit
        });
    }


    // extracts the keys and values for querying
    _extractKeysAndValues(params, idx) {
        // prepare query and params
        const keys = [];
        const values = [];

        // iterate thorugh the parameters
        for (const key of Object.keys(params)) {
            // check if key-value is object
            if (params[key] instanceof Object) {
                // iterate through the object keys to create a query
                for (const kkey of Object.keys(params[key])) {
                    keys.push(`${key}->>'${kkey}'=$${idx}`); idx++;
                    values.push(params[key][kkey]);
                }
            } else {
                // the key-values are primary values
                keys.push(`${key}=$${idx}`); idx++;
                values.push(params[key]);
            }
        }
        // return the key-values
        return { keys, values, idx };
    }


    // extracts the condition rules
    _constructCondition(whereParams, idx) {
        let condition;
        let params = [];
        if (whereParams instanceof Array) {
            // get all conditions together
            const conditionKeys = [];
            for (const cond of whereParams) {
                // extract the conditions and values, concat in an array
                const { keys, values, idx: index } = this._extractKeysAndValues(cond, idx);
                conditionKeys.push(`(${keys.join(" AND ")})`);
                params = params.concat(values);
                idx = index;
            }
            // join the conditions
            condition = conditionKeys.join(" OR ");
        } else {
            const { keys, values, idx: index } = this._extractKeysAndValues(whereParams, idx);
            // join the conditions and prepare the params
            condition = keys.join(" AND ");
            params = params.concat(values);
            idx = index;
        }
        return { condition, params, idx };
    }


    // gets the condition keys and values
    _getConditionKeysAndValues(values, idx) {
        // prepare query and params
        const condition = [];
        const params = [];

        for (const key of Object.keys(values)) {
            // the key-values are primary values
            condition.push(`${key}=$${idx}`); idx++;
            params.push(values[key]);
        }
        // return the key-values and the index
        return { condition, params, idx };
    }


    // execute the query
    async execute(statement, params) {
        const client = await this._pool.connect();
        // execute the statement
        let results;
        try {
            // execute statement
            if (params.length === 0) {
                results = await client.query(statement);
            } else {
                results = await client.query(statement, params);
            }
        } catch (error) {
            // release the client
            client.release();
            throw error;
        }
        // release the client
        client.release();
        return results ? results.rows : [];
    }


    // executes a large query given the values
    async executeLarge(statement, params, batchSize, batchCallback, callback) {
        const client = await this._pool.connect();
        // create a cursor (with or without the parameters provided)
        const cursor = params.length
            ? client.query(new Cursor(statement, params))
            : client.query(new Cursor(statement));

        let lastBatch = batchSize;
        // This function designates what to do with the values read by the cursor.
        function _batchFunction(xcallback) {
            cursor.read(batchSize, (xerror, rows) => {
                if (xerror) {
                    lastBatch = 0;
                    return xcallback(xerror);
                } else {
                    lastBatch = rows.length;
                    // activate the batch callback function
                    return batchCallback(null, rows, xcallback);
                }
            });
        }
        // what to do when all of the batches were processed
        function _batchFinalFunction(error) {
            cursor.close(() => {
                cursor.release();
                return callback(error);
            });
        }
        // start processing records in postgres
        async.whilst(
            () => batchSize === lastBatch,
            _batchFunction,
            _batchFinalFunction
        );
    }


    // inserts the object in the database
    async insert(record, table) {
        // get the record keys and values
        const keys = [];
        const params = [];
        // populate key and params arrays
        Object.entries(record).forEach((value) => {
            keys.push(value[0]);
            params.push(value[1]);
        });
        // prepare the query command
        const recordValIds = [...Array(keys.length).keys()]
            .map((id) => `$${id + 1}`)
            .join(",");

        const query = `
            INSERT INTO ${table} (${keys.join(",")}) VALUES (${recordValIds})
            RETURNING *;
        `;
        // execute the query
        return await this.execute(query, params);
    }


    // finds the rows in the database
    async select(conditions, table) {
        // set the conditions and parameters
        const { condition, params } = this._constructCondition(conditions, 1);
        // prepare the query command
        const query = params.length
            ? `SELECT * FROM ${table} WHERE ${condition};`
            : `SELECT * FROM ${table};`;
        // execute the query
        return await this.execute(query, params);
    }


    // fins the rows in the database (large version)
    selectLarge(conditions, table, batchSize, batchCallback, callback) {
        // set the conditions and parameters
        const { condition, params } = this._constructCondition(conditions, 1);
        // prepare the query command
        const query = params.length
            ? `SELECT * FROM ${table} WHERE ${condition};`
            : `SELECT * FROM ${table};`;
        // execute the query
        this.executeLarge(query, params, batchSize, batchCallback, callback);
    }


    // count the number of rows in the database following some conditions
    async count(conditions, table) {
        // set the conditions and parameters
        const { condition, params } = this._constructCondition(conditions, 1);
        // prepare the query command
        const query = params.length
            ? `SELECT COUNT(*) FROM ${table} WHERE ${condition};`
            : `SELECT COUNT(*) FROM ${table};`;
        // execute the query
        return await this.execute(query, params);
    }


    // update the rows in the database
    async update(values, conditions, table) {
        // get the values used to update the records
        const {
            condition: valueConditions,
            params: valueParams,
            idx
        } = this._getConditionKeysAndValues(values, 1);
        // get conditions and associated values
        const { condition, params } = this._constructCondition(conditions, idx);
        // get joint parameters
        const allParams = valueParams.concat(params);
        // prepare query and params
        const query = `
            UPDATE ${table} SET ${valueConditions.join(", ")}
            ${condition.length ? `WHERE ${condition}` : ""}
            RETURNING *;
        `;
        // execute the query
        return await this.execute(query, allParams);
    }


    // deletes the rows in the database
    async delete(conditions, table) {
        // get the conditions and prepare the query
        const { condition, params } = this._constructCondition(conditions, 1);
        const query = `
            DELETE FROM ${table}
            ${condition ? `WHERE ${condition}` : ""}
            RETURNING *;
        `;
        // execute the query
        return await this.execute(query, params);
    }


    // upserts (updates or inserts) the row in the database
    async upsert(record, conditions, table) {
        // get the record keys and values
        const recordKeys = Object.keys(record);
        const recordValIds = [...Array(recordKeys.length).keys()]
            .map((id) => `$${id + 1}`).join(",");

        // get the values used to update the records
        const { condition, params } = this._getConditionKeysAndValues(record, 1);

        // get the condition keys - must be UNIQUE
        const conditionKeys = Object.keys(conditions);
        if (conditionKeys.length > 1) {
            throw new Error(`[PostgresQL upsert] Too many conditions ${conditionKeys.join(",")}`);
        }
        // create the query command
        const query = `
            INSERT INTO ${table} (${recordKeys.join(",")}) VALUES (${recordValIds})
            ON CONFLICT (${conditionKeys.join(", ")})
                DO UPDATE SET ${condition.join(", ")}
            RETURNING *;
        `;
        // execute the query
        return await this.execute(query, params);
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
        const billions = number / 1e9;
        const millions = number / 1e6;
        const thousands = number / 1e3;

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
        if (Math.floor(billions)) {
            return `${toFixed(billions)}B`;
        } else if (Math.floor(millions)) {
            return `${toFixed(millions)}M`;
        } else if (Math.floor(thousands)) {
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
    async selectProviderStats(tokens) {
        /**
         * Prepares the API key instance for consumption by formating the date_created
         * and permissions attributes.
         * @param {Object} instance - The API key object.
         * @returns {Object} The `instance` object with the prepared values.
         */
        const prepareOERProviders = (instance) => {
            // beautify the date created value
            instance.material_count = parseInt(instance.material_count || 0, 10);
            instance.material_count_clean = this._numberFormat(instance.material_count);
            instance.visit_count = parseInt(instance.visit_count || 0, 10);
            instance.visit_count_clean = this._numberFormat(instance.visit_count);
            // return the instance
            return instance;
        };

        // add token based contraint
        let parameters = [];
        let constraint = "";
        let count = 1;
        if (Array.isArray(tokens)) {
            parameters = tokens;
            constraint = `WHERE providers.token IN (${tokens.map((t) => `$${count++}`).join(",")})`;
        } else if (typeof tokens === "string") {
            parameters = [tokens];
            constraint = `WHERE providers.token IN ($${count++})`;
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
        const results = await this.execute(query, parameters);

        return results.map(prepareOERProviders);
    }
}

module.exports = PostgreSQL;
