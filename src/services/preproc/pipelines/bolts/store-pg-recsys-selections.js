/** ******************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

class StorePGRecsysTransitions {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePGRecsysTransitions ${this._name}]`;

        // create the postgres connection
        this._pg = require("@library/postgresQL")(config.pg);

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
            from,
            to,
            uuid,
            selected_position,
            recommended_urls
        } = message;

        const fromMaterialModelId = new Promise((resolve, reject) => {
            self._pg.select({ provider_uri: from }, "rec_sys_material_model", (error, result) => {
                if (error) { return reject(error); }
                // return the id of the material model
                const id = result.length ? result[0].id : null;
                return resolve(id);
            });
        });

        const toMaterialModelId = new Promise((resolve, reject) => {
            self._pg.select({ provider_uri: to }, "rec_sys_material_model", (error, result) => {
                if (error) { return reject(error); }
                // return the id of the material model
                const id = result.length ? result[0].id : null;
                return resolve(id);
            });
        });


        Promise.all([fromMaterialModelId, toMaterialModelId]).then((materialModalIds) => {
            // create user transitions values
            const rec_sys_user_transitions = {
                uuid: !uuid.includes("unknown") ? uuid : null,
                from_url: from,
                to_url: to,
                from_material_model_id: materialModalIds[0],
                to_material_model_id: materialModalIds[1],
                selected_position,
                recommended_urls,
                num_of_recommendations: recommended_urls.length
            };

            self._pg.insert(rec_sys_user_transitions, "rec_sys_user_transitions", (error, result) => {
                if (error) { return callback(error); }
                // return the id of the material model
                return callback(null);
            });
        }).catch((error) => callback(error));
    }
}

exports.create = function (context) {
    return new StorePGRecsysTransitions(context);
};
