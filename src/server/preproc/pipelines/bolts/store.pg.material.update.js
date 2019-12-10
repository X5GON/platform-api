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
                transcriptions,
                wikipedia_concepts,
                ttp_id
            }
        } = message;

        console.log(material_id);
        console.log(transcriptions);
        console.log(wikipedia_concepts);
        console.log(raw_text);

        let tasks = [];

        ///////////////////////////////////////////
        // SAVE MATERIAL CONTENTS
        ///////////////////////////////////////////

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
                        material_id,
                        last_updated: (new Date()).toISOString()
                    });
                }
            }
        } else if (raw_text) {
            // prepare the material content object
            material_contents.push({
                language: origin_language,
                type: 'transcription',
                extension: 'plain',
                value: { value: raw_text },
                material_id,
                last_updated: (new Date()).toISOString()
            });
        }

        for (let material_content of material_contents) {
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

        // // add the task of pushing material contents
        // tasks.push(function (xcallback) {
        //     self._pg.execute(`DELETE FROM material_contents WHERE material_id=${material_id} AND last_updated IS NULL;`, [], function (e, res) {
        //         if (e) { return xcallback(e); }
        //         return xcallback(null, 1);
        //     });
        // });


         ///////////////////////////////////////////
        // SAVE WIKIFIER REPRESENTATION
        ///////////////////////////////////////////

        // prepare of public feature - wikipedia concept
        let features_public = {
            name: 'wikipedia_concepts',
            value: { value: wikipedia_concepts },
            re_required: true,
            record_id: material_id,
            table_name: 'oer_materials'
        }

        tasks.push(function (xcallback) {
            self._pg.insert(features_public, 'features_public', function (e, res) {
                if (e) { return xcallback(e); }
                return xcallback(null, 1);
            });
        });

        ///////////////////////////////////////////
        // DELETE PREVIOUS WIKIFIER REPRESENTATION
        ///////////////////////////////////////////

        // add the task of pushing material contents
        // tasks.push(function (xcallback) {
        //     self._pg.execute(`DELETE FROM features_public WHERE record_id=${material_id} AND table_name='oer_materials' AND name='wikipedia_concepts' AND re_required IS TRUE AND last_updated IS NULL;`, [], function (e, res) {
        //         if (e) { return xcallback(e); }
        //         return xcallback(null, 1);
        //     });
        // });



        ///////////////////////////////////////////
        // UPDATE MATERIAL RETRIEVAL DATE
        ///////////////////////////////////////////

        // add the task of pushing material contents
        tasks.push(function (xcallback) {
            self._pg.update({ retrieved_date: (new Date()).toISOString(), ttp_id }, { id: material_id }, "oer_materials", function (e, res) {
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
