/********************************************************************
 * Extraction: DFXP
 * Extracts text from dfxp of materials that are considered video
 */

// internal libraries
const dfxp2srt = require('../../../../lib/python-dfxp2srt');

class ExtractionDFXP {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._context = context;

        this._prefix = `[ExtractionDFXP ${this._name}]`;
        this._dfxpFolder = config.dfxp_folder;
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

    receive(material, stream_id, callback) {

        // get the raw text associated with the videos
        try {
            let slug = material.provideruri.split('/')[3];
            let promise = dfxp2srt(slug, this._dfxpFolder);

            // get the responses
            promise.then(transcripts => {
                // set placeholders for the values
                let originDfxp, originText, transcriptions = { };

                // iterate through the transcripts and save them
                for (let transcript of transcripts) {
                    const { lang, dfxp, plain } = transcript;
                    transcriptions[lang] = { dfxp, plain };

                    if (material.language === lang) {
                        originText = plain;
                        originDfxp = dfxp;
                    }
                }

                // assign the extracted attributes to the material
                material.materialmetadata.dfxp = originDfxp;
                material.materialmetadata.rawText = originText;
                material.materialmetadata.transcriptions = transcriptions;

                // send the material to the next component
                return this._onEmit(material, stream_id, callback);
            }).catch(error => {
                // unable to process the material
                material.message = `${this._prefix} ${error.message}`;
                return this._onEmit(material, 'stream_partial', callback);
            });
        } catch (error) {
            // unable to process the material
            material.message = `${this._prefix} ${error.message}`;
            return this._onEmit(material, 'stream_partial', callback);
        }
    }
}

exports.create = function (context) {
    return new ExtractionDFXP(context);
};