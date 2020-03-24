/** ******************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */


class StorePGMaterialPartial {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePGMaterialPartial ${this._name}]`;

        // create the postgres connection
        this._pg = require("@library/postgresQL")(config.pg);

        this._finalBolt = config.final_bolt || false;

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // close connection to postgres database
        this._pg.close(callback);
    }

    receive(message, stream_id, callback) {
        let self = this;

        // get sent values
        const {
            oer_materials_partial
        } = message;

        self._pg.upsert(oer_materials_partial, { materialurl: null }, "oer_materials_partial", (error, result) => {
            if (error) { return callback(error); }
            if (self._finalBolt) { return callback(); }
            return this._onEmit(message, stream_id, callback);
        }); // self._pg.insert(oer_materials_partial)
    }
}

exports.create = function (context) {
    return new StorePGMaterialPartial(context);
};
