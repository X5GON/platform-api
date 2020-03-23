/** ******************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

const async = require("async");

class StorePGMaterialComplete {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePGMaterialComplete ${this._name}]`;

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

        const {
            oer_materials,
            material_contents,
            features_public,
            urls,
            provider_token
        } = message;

        // otherwise insert the missing values
        self._pg.insert(oer_materials, "oer_materials", (error, result) => {
            if (error) { return callback(); }
            // get material id
            const material_id = result[0].id;

            // tasks container
            const tasks = [];

            const date = (new Date()).toISOString();

            // /////////////////////////////////////////
            // SAVE MATERIAL CONTENTS
            // /////////////////////////////////////////

            for (let material_content of material_contents) {
                material_content.material_id = material_id;
                material_content.last_updated = date;
                // add the task of pushing material contents
                tasks.push((xcallback) => {
                    self._pg.insert(material_content, "material_contents", (e, res) => {
                        if (e) { return xcallback(e); }
                        return xcallback(null, 1);
                    });
                });
            }

            // /////////////////////////////////////////
            // SAVE FEATURES PUBLIC
            // /////////////////////////////////////////

            features_public.record_id = material_id;
            features_public.table_name = "oer_materials";
            features_public.last_updated = date;
            tasks.push((xcallback) => {
                self._pg.insert(features_public, "features_public", (e, res) => {
                    if (e) { return xcallback(e); }
                    return xcallback(null, 1);
                });
            });

            // /////////////////////////////////////////
            // SAVE URLS
            // /////////////////////////////////////////

            tasks.push((xcallback) => {
                // check for provider in database
                self._pg.select({ token: provider_token }, "providers", (xe, results) => {
                    if (xe) { return xcallback(xe); }
                    const provider_id = results.length ? results[0].id : null;
                    // set the provider id if inside the database
                    let material_url = {
                        url: urls.material_url,
                        material_id,
                        ...provider_id && { provider_id }
                    };

                    let provider_uri = {
                        url: urls.provider_uri,
                        ...provider_id && { provider_id }
                    };

                    // set url list
                    const urlData = [provider_uri, material_url];
                    // create requests
                    const promises = urlData.map((url) => new Promise((resolve, reject) => {
                        self._pg.upsert(url, { url: null }, "urls", (e, res) => {
                            if (e) { return reject(e); }
                            return resolve(res[0].id);
                        });
                    }));

                    Promise.all(promises).then((ids) => {
                        // insert the contains record
                        self._pg.execute(`INSERT INTO contains (container_id, contains_id) VALUES (${ids[0]}, ${ids[1]}) ON CONFLICT ON CONSTRAINT contains_pkey DO NOTHING;`, [], (e) => {
                            if (e) { return xcallback(e); }
                            return xcallback(null, 1);
                        });
                    }).catch((e) => xcallback(e));
                });
            });

            // /////////////////////////////////////////
            // RUN THE TASKS
            // /////////////////////////////////////////

            // update the message with the material id
            message.oer_materials.material_id = material_id;
            async.series(tasks, (e) => {
                if (e) { return callback(null); }
                if (self._finalBolt) { return callback(); }
                return self._onEmit(message, stream_id, callback);
            });
        }); // self._pg.insert(oer_materials)
    }
}

exports.create = function (context) {
    return new StorePGMaterialComplete(context);
};
