/********************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */


class PostgresqlMaterialPartial {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[PostgresqlMaterialPartial ${this._name}]`;

        // create the postgres connection
        this._pg = require('@lib/postgresQL')(config.pg);

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

    receive(message, stream_id, callback) {
        let self = this;

        // get sent values
        const {
            oer_materials_partial
        } = message;

        self._pg.upsert(oer_materials_partial, { materialurl: null }, 'oer_materials_partial', (error, result) => {
            if (error) { return callback(error); }
            return callback();
        }); // self._pg.insert(oer_materials_partial)
    }
}

exports.create = function (context) {
    return new PostgresqlMaterialPartial(context);
};
