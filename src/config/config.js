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
    platform: {
        cookieID: "x5gonTrack",
        google: {
            reCaptcha: {
                verifyUrl: "https://www.google.com/recaptcha/api/siteverify",
                siteKey: process.env.GOOGLE_RECAPTCHA_SITEKEY,
                secret: process.env.GOOGLE_RECAPTCHA_SECRET
            }
        }
    },
    preproc: {
        retrievers: [
            {
                name: "Videolectures.NET",
                domain: "http://videolectures.net/",
                script: "api-videolectures",
                token: process.env.TOKEN_VIDEOLECTURES,
                config: {
                    apikey: process.env.RETRIEVERS_VL_APIKEY
                }
            }
        ],
        wikifier: {
            wikifierUrl: process.env.PREPROC_WIKIFIER_URL,
            userKey: process.env.PREPROC_WIKIFIER_USERKEY
        },
        ttp: {
            user: process.env.PREPROC_TTP_USER,
            token: process.env.PREPROC_TTP_TOKEN,
        }
    },
    quality: {
        // used for proxying to the quality assurance service
        port: parseInt(process.env.SERVICE_QUALITY_PORT) || 6001
    },
};


// production environment configurations
const production = {
    platform: {
        port: parseInt(process.env.PROD_PLATFORM_PORT) || 8080,
        sessionSecret: process.env.PROD_PLATFORM_SESSION_SECRET,
    },
    recsys: {
        port: parseInt(process.env.PROD_RECSYS_PORT) || 3000
    },
    search: {
        port: parseInt(process.env.PROD_SEARCH_PORT) || 3100
    },
    kafka: {
        host: process.env.PROD_KAFKA_HOST || "127.0.0.1:9092",
        groupId: process.env.PROD_KAFKA_GROUP || "productionGroup"
    },
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
    platform: {
        port: parseInt(process.env.DEV_PLATFORM_PORT) || 8081,
        sessionSecret: process.env.DEV_PLATFORM_SESSION_SECRET,
    },
    recsys: {
        port: parseInt(process.env.DEV_RECSYS_PORT) || 3001
    },
    search: {
        port: parseInt(process.env.DEV_SEARCH_PORT) || 3101
    },
    kafka: {
        host: process.env.DEV_KAFKA_HOST || "127.0.0.1:9092",
        groupId: process.env.DEV_KAFKA_GROUP || "developmentGroup"
    },
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
    platform: {
        port: parseInt(process.env.TEST_PLATFORM_PORT) || 8082,
        sessionSecret: process.env.TEST_PLATFORM_SESSION_SECRET,
    },
    recsys: {
        port: parseInt(process.env.TEST_RECSYS_PORT) || 3002
    },
    search: {
        port: parseInt(process.env.TEST_SEARCH_PORT) || 3102
    },
    kafka: {
        host: process.env.TEST_KAFKA_HOST || "127.0.0.1:9092",
        groupId: process.env.TEST_KAFKA_GROUP || "testGroup"
    },
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
