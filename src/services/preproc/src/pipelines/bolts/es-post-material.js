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
class ElastisearchPost extends BasicBolt {
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
        this._prefix = `[ElastisearchPost ${this._name}]`;

        // the url of the TTP platform
        this._searchURL = config.search_url;

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
            oer_materials: {
                material_id,
                title,
                description,
                language,
                creation_date,
                retrieved_date,
                type,
                mimetype,
                license
            },
            material_contents,
            features_public,
            urls: {
                material_url,
                provider_uri: website_url
            },
            provider_token
        } = message;


        let contents = [];
        for (let content of material_contents) {
            contents.push({
                language: content.language,
                type: content.type,
                extension: content.extension,
                value: content.value.value
            });
        }

        // check for provider in database
        self._pg.select({ token: provider_token }, "providers", (xe, results) => {
            const {
                id: provider_id,
                name: provider_name,
                domain: provider_url
            } = results[0];

            const record = {
                material_id,
                title,
                description,
                creation_date,
                retrieved_date,
                type,
                mimetype,
                material_url,
                website_url,
                provider_id,
                provider_name,
                provider_url,
                language,
                license,
                contents,
                wikipedia: features_public.value.value
            };

            rp({
                method: "POST",
                uri: self._searchURL,
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
        });
    }
}

exports.create = function (context) {
    return new ElastisearchPost(context);
};
