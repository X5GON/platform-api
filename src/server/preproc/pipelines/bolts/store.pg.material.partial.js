/********************************************************************
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
        this._pg = require('@library/postgresQL')(config.pg);

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
            return self._changeStatus(oer_materials_partial.materialurl, callback);
        }); // self._pg.insert(oer_materials_partial)
    }

    /**
     * Changes the status of the material process.
     * @param {Object} url - The material url.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(url, callback) {
        return this._pg.update(
            { status: 'material error when processing. See oer_materials_partial table or log files' },
            { url },
            'material_process_pipeline', () => {
                // trigger the callback function
                return callback();
            }
        );
    }
}

exports.create = function (context) {
    return new StorePGMaterialPartial(context);
};
