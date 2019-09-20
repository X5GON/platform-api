/********************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

const async = require('async');

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
            oer_materials,
            material_contents,
            features_public,
            urls,
            provider_token
        } = message;

        self._pg.select({ url: urls.material_url }, 'material_process_pipeline', function (error, result) {
            if (error) { return callback(error); }

            // the database already has the material
            if (result.length && result[0].status === 'finished') { return callback(); }

            // otherwise insert the missing values
            self._pg.insert(oer_materials, 'oer_materials', (error, result) => {
                if (error) { return callback(error); }
                // get material id
                const material_id = result[0].id;

                // tasks container
                const tasks = [];

                ///////////////////////////////////////////
                // SAVE MATERIAL CONTENTS
                ///////////////////////////////////////////

                for (let material_content of material_contents) {
                    material_content.material_id = material_id;
                    // add the task of pushing material contents
                    tasks.push(function (xcallback) {
                        self._pg.insert(material_content, 'material_contents', function (e, res) {
                            if (e) { return xcallback(e); }
                            return xcallback(null, 1);
                        });
                    });
                }

                ///////////////////////////////////////////
                // SAVE FEATURES PUBLIC
                ///////////////////////////////////////////

                features_public.record_id  = material_id;
                features_public.table_name = 'oer_materials';

                tasks.push(function (xcallback) {
                    self._pg.insert(features_public, 'features_public', function (e, res) {
                        if (e) { return xcallback(e); }
                        return xcallback(null, 1);
                    });
                });

                ///////////////////////////////////////////
                // SAVE URLS
                ///////////////////////////////////////////

                tasks.push(function (xcallback) {
                    // check for provider in database
                    self._pg.select({ token: provider_token }, 'providers', (xe, results) => {
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
                        const promises = urlData.map(url => {
                            return new Promise((resolve, reject) => {
                                self._pg.upsert(url, { url: null }, 'urls', function (e, res) {
                                    if (e) { return reject(e); }
                                    return resolve(res[0].id);
                                });
                            });
                        });

                        Promise.all(promises).then(ids => {
                            // insert the contains record
                            self._pg.execute(`INSERT INTO contains (container_id, contains_id) VALUES (${ids[0]}, ${ids[1]}) ON CONFLICT ON CONSTRAINT contains_pkey DO NOTHING;`, [], function (e, res) {
                                if (e) { return xcallback(e); }
                                return xcallback(null, 1);
                            });
                        }).catch(e => xcallback(e));
                    });
                });

                ///////////////////////////////////////////
                // RUN THE TASKS
                ///////////////////////////////////////////

                async.series(tasks, function (e) {
                    if (e) { return callback(e); }
                    return self._changeStatus(urls.material_url, callback);
                });

            }); // self._pg.insert(oer_materials)
        });
    }

    /**
     * Changes the status of the material process.
     * @param {Object} url - The material url.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(url, callback) {
        return this._pg.update(
            { status: 'finished' },
            { url },
            'material_process_pipeline', () => {
                // trigger the callback function
                return callback();
            }
        );
    }
}

exports.create = function (context) {
    return new StorePGMaterialComplete(context);
};
