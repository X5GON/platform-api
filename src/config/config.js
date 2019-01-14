// external modules
const path = require('path');

// import configured node variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// get process environment
const env = process.env.NODE_ENV || 'dev';

// production environment configurations
const prod = {
    platform: {
        port: parseInt(process.env.PROD_PLATFORM_PORT) || 8080,
        sessionSecret: process.env.PROD_PLATFORM_SESSION_SECRET,
        google: {
            reCaptcha: {
                verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
                siteKey: process.env.PROD_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY,
                secret: process.env.PROD_PLATFORM_GOOGLE_RECAPTCHA_SECRET
            }
        }
    },
    recsys: {
        port: parseInt(process.env.PROD_RECSYS_PORT) || 3000
    },
    preproc: {
        retrievers: [
            {
                name: "Videolectures.NET",
                domain: "http://videolectures.net/",
                script: "videolectures-api.js",
                config: {
                    apikey: process.env.PROD_PREPROC_RETRIEVERS_VL_APIKEY
                }
            }
        ],
        wikifier: {
            wikifierUrl: process.env.PROD_PREPROC_WIKIFIER_URL,
            userKey: process.env.PROD_PREPROC_WIKIFIER_USERKEY
        }
    },
    monitor: {
        port: parseInt(process.env.PROD_MONITOR_PORT) || 7500,
        sessionSecret: process.env.PROD_MONITOR_SESSION_SECRET,
        adminToken: process.env.PROD_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.PROD_KAFKA_HOST || '192.168.99.100:9092'
    },
    pg: {
        host: process.env.PROD_PG_HOST || 'localhost',
        port: parseInt(process.env.PROD_PG_PORT) || 5432,
        database: process.env.PROD_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.PROD_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.PROD_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.PROD_PG_USER || 'postgres',
        password: process.env.PROD_PG_PASSWORD,
        schema: process.env.PROD_PG_SCHEMA || 'public',
        version: process.env.PROD_PG_VERSION || '*'
    }
};

// development environment configurations
const dev = {
    platform: {
        port: parseInt(process.env.DEV_PLATFORM_PORT) || 8081,
        sessionSecret: process.env.DEV_PLATFORM_SESSION_SECRET,
        google: {
            reCaptcha: {
                verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
                siteKey: process.env.DEV_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY,
                secret: process.env.DEV_PLATFORM_GOOGLE_RECAPTCHA_SECRET
            }
        }
    },
    recsys: {
        port: parseInt(process.env.DEV_RECSYS_PORT) || 3001
    },
    preproc: {
        retrievers: [
            {
                name: "Videolectures.NET",
                domain: "http://videolectures.net/",
                script: "videolectures-api.js",
                config: {
                    apikey: process.env.DEV_PREPROC_RETRIEVERS_VL_APIKEY
                }
            }
        ],
        wikifier: {
            wikifierUrl: process.env.DEV_PREPROC_WIKIFIER_URL,
            userKey: process.env.DEV_PREPROC_WIKIFIER_USERKEY
        }
    },
    monitor: {
        port: parseInt(process.env.DEV_MONITOR_PORT) || 7501,
        sessionSecret: process.env.DEV_MONITOR_SESSION_SECRET,
        adminToken: process.env.DEV_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.DEV_KAFKA_HOST || '192.168.99.100:9092'
    },
    pg: {
        host: process.env.DEV_PG_HOST || 'localhost',
        port: parseInt(process.env.DEV_PG_PORT) || 5432,
        database: process.env.DEV_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.DEV_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.DEV_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.DEV_PG_USER || 'postgres',
        password: process.env.DEV_PG_PASSWORD,
        schema: process.env.DEV_PG_SCHEMA || 'public',
        version: process.env.DEV_PG_VERSION || '*'
    }
};

// test environment configurations
const test = {
    platform: {
        port: parseInt(process.env.TEST_PLATFORM_PORT) || 8082,
        sessionSecret: process.env.TEST_PLATFORM_SESSION_SECRET,
        google: {
            reCaptcha: {
                verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
                siteKey: process.env.TEST_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY,
                secret: process.env.TEST_PLATFORM_GOOGLE_RECAPTCHA_SECRET
            }
        }
    },
    recsys: {
        port: parseInt(process.env.TEST_RECSYS_PORT) || 3002
    },
    preproc: {
        retrievers: [
            {
                name: "Videolectures.NET",
                domain: "http://videolectures.net/",
                script: "videolectures-api.js",
                config: {
                    apikey: process.env.TEST_PREPROC_RETRIEVERS_VL_APIKEY
                }
            }
        ],
        wikifier: {
            wikifierUrl: process.env.TEST_PREPROC_WIKIFIER_URL,
            userKey: process.env.TEST_PREPROC_WIKIFIER_USERKEY
        }
    },
    monitor: {
        port: parseInt(process.env.TEST_MONITOR_PORT) || 7502,
        sessionSecret: process.env.TEST_MONITOR_SESSION_SECRET,
        adminToken: process.env.TEST_MONITOR_ADMIN_TOKEN
    },
    kafka: {
        host: process.env.TEST_KAFKA_HOST || '192.168.99.100:9092'
    },
    pg: {
        host: process.env.TEST_PG_HOST || 'localhost',
        port: parseInt(process.env.TEST_PG_PORT) || 5432,
        database: process.env.TEST_PG_DATABASE || 'x5gon',
        max: parseInt(process.env.TEST_PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.TEST_PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.TEST_PG_USER || 'postgres',
        password: process.env.TEST_PG_PASSWORD,
        schema: process.env.TEST_PG_SCHEMA || 'public',
        version: process.env.TEST_PG_VERSION || '*'
    }
};

// store the configuration in a single json
const config = {
    prod,
    dev,
    test
};

// export the configuration
module.exports = config[env];
