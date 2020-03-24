/** ******************************************************************
 * Extract Video Transcriptions and Translations via TTP
 * This component makes a request to the UPV's Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the video content as raw text and dfxp.]
 */

// external modules
const rp = require("request-promise-native");
// basic bolt template
const BasicBolt = require("./basic-bolt");

/**
 * @class ElastisearchPatch
 * @description Extracts transcriptions and translations from the
 * provided videos. Supported languages are: english, spanish,
 * german, and slovene.
 */
class ElastisearchPatch extends BasicBolt {
    constructor() {
        super();
        this._name = null;
        this._context = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ElastisearchPatch ${this._name}]`;

        // the url of the TTP platform
        this._searchUrl = config.search_url;

        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }


    async receive(message, stream_id, callback) {
        let self = this;


        const {
            material_id,
            new_date,
            language: origin_language,
            material_metadata: {
                raw_text,
                transcriptions,
                wikipedia_concepts,
            }
        } = message;


        // set the material contents
        let material_contents = [];
        // prepare list of material contents
        if (transcriptions) {
            for (let language in transcriptions) {
                for (let extension in transcriptions[language]) {
                    // get value of the language and extension
                    const value = transcriptions[language][extension];

                    // define the type of the transcriptions
                    const type = language === origin_language
                        ? "transcription"
                        : "translation";

                    material_contents.push({
                        language,
                        type,
                        extension,
                        value
                    });
                }
            }
        } else if (raw_text) {
            // prepare the material content object
            material_contents.push({
                language: origin_language,
                type: "transcription",
                extension: "plain",
                value: raw_text,
            });
        }

        const record = {
            retrieved_date: new_date,
            contents: material_contents,
            wikipedia: wikipedia_concepts
        };

        rp({
            method: "PATCH",
            uri: `${self._searchUrl}/${material_id}`,
            body: { record },
            json: true
        })
            .then(() => {
            // continue with the last patching
                if (self._finalBolt) { return callback(); }
                return self._onEmit(message, stream_id, callback);
            })
            .catch((error) => {
                if (self._finalBolt) { return callback(); }
                // log error message and store the not completed material
                self.set(message, self._documentErrorPath, `${self._prefix} ${error.message}`);
                return self._onEmit(message, stream_id, callback);
            });
    }
}

exports.create = function (context) {
    return new ElastisearchPatch(context);
};
