/********************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

const async = require('async');

class StorePGMaterialUpdate {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePGMaterialUpdate ${this._name}]`;

        // create the postgres connection
        this._pg = require('@library/postgresQL')(config.pg);

        this._productionModeFlag = config.production_mode;
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

        // update the material content records
        return self._updateMaterialContent(message, callback);
    }


    _updateMaterialContent(message, callback) {
        let self = this;

        const {
            material_id,
            language: origin_language,
            material_metadata: {
                raw_text,
                transcriptions
            }
        } = message;

        // set the material contents
        let material_contents = [];
        // prepare list of material contents
        if (transcriptions) {
            let languages = Object.keys(transcriptions);
            for (let language of languages) {
                let extensions = Object.keys(transcriptions[language]);
                for (let extension of extensions) {
                    // get value of the language and extension
                    const value = transcriptions[language][extension];

                    // define the type of the transcriptions
                    const type = language === origin_language ?
                        'transcription' :
                        'translation';

                    material_contents.push({
                        language,
                        type,
                        extension,
                        value: { value },
                        material_id: null,
                        last_updated: (new Date()).toISOString()
                    });
                }
            }
        } else if (raw_text) {
            // get the raw text of the material
            const value = raw_text;
            // prepare the material content object
            material_contents.push({
                language: origin_language,
                type: 'transcription',
                extension: 'plain',
                value: { value },
                material_id: null,
                last_updated: (new Date()).toISOString()
            });
        }


        let tasks = [];

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
        // DELETE PREVIOUS CONTENTS
        ///////////////////////////////////////////

        // add the task of pushing material contents
        tasks.push(function (xcallback) {
            self._pg.execute(`DELETE FROM material_contents WHERE material_id=${material_id} AND last_updated IS NULL;`, [], function (e, res) {
                if (e) { return xcallback(e); }
                return xcallback(null, 1);
            });
        });

        ///////////////////////////////////////////
        // RUN THE TASKS
        ///////////////////////////////////////////

        console.log(material_id);
        async.series(tasks, function (e) {
            if (e) { return callback(null); }
            return callback();
        });

    }
}

exports.create = function (context) {
    return new StorePGMaterialUpdate(context);
};
