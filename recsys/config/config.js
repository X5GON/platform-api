/** **********************************************
 * Project Configurations
 */

// external modules
const path = require("path");

// import configured node variables
require("dotenv").config({ path: path.resolve(__dirname, "../../env/.env") });

// get process environment
const env = process.env.NODE_ENV || "development";

// the common configurations
const common = {
    environment: env,
    isProduction: env === "production",
    platform: {
        cookieID: "x5gonConnect"
    }
};


// production environment configurations
const production = {
    pg: {
        host: process.env.PROD_PG_HOST || "127.0.0.1",
        port: parseInt(process.env.PROD_PG_PORT) || 5432,
        database: process.env.PROD_PG_DATABASE || "x5gon",
        max: parseInt(process.env.PROD_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.PROD_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.PROD_PG_USER || "postgres",
        password: process.env.PROD_PG_PASSWORD,
        schema: process.env.PROD_PG_SCHEMA || "public",
        version: process.env.PROD_PG_VERSION || "*"
    }
};

// development environment configurations
const development = {
    pg: {
        host: process.env.DEV_PG_HOST || "127.0.0.1",
        port: parseInt(process.env.DEV_PG_PORT) || 5432,
        database: process.env.DEV_PG_DATABASE || "x5gon",
        max: parseInt(process.env.DEV_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.DEV_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.DEV_PG_USER || "postgres",
        password: process.env.DEV_PG_PASSWORD,
        schema: process.env.DEV_PG_SCHEMA || "public",
        version: process.env.DEV_PG_VERSION || "*"
    }
};

// test environment configurations
const test = {
    pg: {
        host: process.env.TEST_PG_HOST || "127.0.0.1",
        port: parseInt(process.env.TEST_PG_PORT) || 5432,
        database: process.env.TEST_PG_DATABASE || "x5gon",
        max: parseInt(process.env.TEST_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.TEST_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.TEST_PG_USER || "postgres",
        password: process.env.TEST_PG_PASSWORD,
        schema: process.env.TEST_PG_SCHEMA || "public",
        version: process.env.TEST_PG_VERSION || "*"
    }
};

// store the configuration in a single json
const config = {
    production,
    development,
    test
};

/**
 * Creates a deep merge between two JSON objects.
 * @param {Object} target - The target json object.
 * @param {Object} source - The soruce json object.
 * @returns {Object} The merged JSON as the `target` object.
 */
function merge(target, source) {
    // Iterate through `source` properties
    // If an `Object` set property to merge of `target` and `source` properties
    for (let key of Object.keys(source)) {
        if (source[key] instanceof Object) {
            Object.assign(source[key], merge(target[key], source[key]));
        }
    }
    // Join `target` and modified `source`
    Object.assign(target || {}, source);
    return target;
}

// export the configuration
module.exports = merge(common, config[env]);
