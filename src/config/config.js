// external modules
const path = require('path');

// import configured node variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// get process environment
const env = process.env.NODE_ENV || 'dev';

// the common configurations
const common = {
    platform: {
        google: {
            reCaptcha: {
                verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
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
                script: "api-videolectures.js",
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
    kafka: {
        topics: ['video.topic', 'text.topic']
    }
};


// production environment configurations
const prod = {
    platform: {
        port: parseInt(process.env.PROD_PLATFORM_PORT) || 8080,
        sessionSecret: process.env.PROD_PLATFORM_SESSION_SECRET,
    },
    recsys: {
        port: parseInt(process.env.PROD_RECSYS_PORT) || 3000
    },
    monitor: {
        port: parseInt(process.env.PROD_MONITOR_PORT) || 7500,
        sessionSecret: process.env.PROD_MONITOR_SESSION_SECRET,
        adminToken: process.env.PROD_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.PROD_KAFKA_HOST || '127.0.0.1:9092',
    },
    pg: {
        host: process.env.PROD_PG_HOST || '127.0.0.1',
        port: parseInt(process.env.PROD_PG_PORT) || 5432,
        database: process.env.PROD_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.PROD_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.PROD_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.PROD_PG_USER || 'postgres',
        password: process.env.PROD_PG_PASSWORD
    }
};

// development environment configurations
const dev = {
    platform: {
        port: parseInt(process.env.DEV_PLATFORM_PORT) || 8081,
        sessionSecret: process.env.DEV_PLATFORM_SESSION_SECRET,
    },
    recsys: {
        port: parseInt(process.env.DEV_RECSYS_PORT) || 3001
    },
    monitor: {
        port: parseInt(process.env.DEV_MONITOR_PORT) || 7501,
        sessionSecret: process.env.DEV_MONITOR_SESSION_SECRET,
        adminToken: process.env.DEV_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.DEV_KAFKA_HOST || '127.0.0.1:9092',
    },
    pg: {
        host: process.env.DEV_PG_HOST || '127.0.0.1',
        port: parseInt(process.env.DEV_PG_PORT) || 5432,
        database: process.env.DEV_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.DEV_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.DEV_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.DEV_PG_USER || 'postgres',
        password: process.env.DEV_PG_PASSWORD
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
    monitor: {
        port: parseInt(process.env.TEST_MONITOR_PORT) || 7502,
        sessionSecret: process.env.TEST_MONITOR_SESSION_SECRET,
        adminToken: process.env.TEST_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.TEST_KAFKA_HOST || '127.0.0.1:9092',
    },
    pg: {
        host: process.env.TEST_PG_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_PG_PORT) || 5432,
        database: process.env.TEST_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.TEST_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.TEST_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.TEST_PG_USER || 'postgres',
        password: process.env.TEST_PG_PASSWORD
    }
};

// store the configuration in a single json
const config = {
    prod,
    dev,
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
