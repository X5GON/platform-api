/********************************************************************
 * PostgresQL storage process
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

class PostgresqlStorage {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[PostgresqlStorage ${this._name}]`;

        // create the postgres connection
        this._pg = require('../../../../lib/postgresQL')(config.pg);

        // the postgres table in which we wish to insert
        this._postgresTable = config.postgres_table;

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // close connection to postgres database
        this._pg.close();

        // shutdown component
        callback();
    }

    receive(material, stream_id, callback) {
        // takes the material and insert it into the OER material table
        const materialurl = material.materialurl;
        this._pg.upsert(material, { materialurl: {} }, this._postgresTable, (error, result) => {
            if (error) {
                console.warn({ error: error.message, materialurl });
            } else {
                console.log(`material inserted into ${this._postgresTable} database`,
                    { materialurl: material.materialurl }
                );
            }
            // this is the end of the material processing pipeline
            return callback();
        });
    }
}

exports.create = function (context) {
    return new PostgresqlStorage(context);
};