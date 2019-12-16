/********************************************************************
 * PostgresQL storage process for user activity data
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

class RetrieveMaterialMetadata {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[RetrieveMaterialMetadata ${this._name}]`;
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

    receive(material, stream_id, callback) {
        let self = this;

        const {
            material_id
        } = material;

        this._pg.select({ material_id, type: "text_extraction" }, "material_contents", function (error, response) {
            if (error) { return callback(); }
            const { value } = response[0];
            material.material_metadata.raw_text = value.value;
            // redirect the material
            return self._onEmit(material, stream_id, callback);
        });


    }
}

exports.create = function (context) {
    return new RetrieveMaterialMetadata(context);
};