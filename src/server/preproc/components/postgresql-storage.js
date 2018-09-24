/********************************************************************
 * PostgresQL storage process
 * This component receives the verified OER material object and stores
 * it into postgresQL database.
 */

// internal libraries
const Logger = require('../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('postgresql-storage', 'preproc');

// postgres library
const pg = require('../../../lib/postgresQL')(require('../../../config/pgconfig'));


/**
 * Stores the OER material into PostgresQL database.
 */
class PostgresqlStorage {

    constructor(context) {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state

        // close connection to postgres database
        pg.close();
        // shutdown component
        callback();
    }

    receive(material, stream_id, callback) {
        // log material insertion
        logger.info('start inserting material into oer_material database', { materialUrl: material.materialUrl });
        // takes the material and insert it into the OER material table
        pg.insert(material, 'oer_materials', (error, result) => {
            if (error) {
                // error when parsing response
                logger.error('error [postgresql.insert]: unable to insert material', 
                    { error: error.message, materialUrl: material.materialUrl }
                );
            } else {
                // log successful material insertion
                logger.info('material inserted into oer_material database', { materialUrl: material.materialUrl });
            }
            // this is the end of the pre-processing pipeline
            return callback();
        });
    }
}

exports.create = function (context) { return new PostgresqlStorage(context); };