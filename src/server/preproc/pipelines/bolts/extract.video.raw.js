/********************************************************************
 * Extraction: DFXP
 * Extracts text from dfxp of materials that are considered video
 */

// internal libraries
const dfxp2srt = require('alias:lib/dfxp2srt-wrapper');

class ExtractVideoRaw {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._context = context;

        this._prefix = `[ExtractVideoRaw ${this._name}]`;
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
        let slug;
        if (material.provider_uri.includes('videolectures')) {
            slug = material.provider_uri.split('/')[3];
        } else if (material.provider_uri.includes('media.upv.es')) {
            let sections = material.provider_uri.split('/');
            slug = sections[sections.length - 1];
        } else if (material.provider_uri.includes('virtuos')) {
            let sections = material.provider_uri.split('=');
            slug = sections[sections.length - 1];
        }

        try {
            // get promises
            let promises = dfxp2srt(slug, this._dfxpFolder);
            // get the responses
            Promise.all(promises).then(transcripts => {
                // set placeholders for the values
                let originText, transcriptions = { };

                // iterate through the transcripts and save them
                for (let transcript of transcripts) {
                    const { lang, dfxp, plain } = transcript;
                    transcriptions[lang] = { dfxp, plain };

                    if (material.language === lang) {
                        originText = plain;
                    }
                }

                // assign the extracted attributes to the material
                material.material_metadata.raw_text = originText;
                material.material_metadata.transcriptions = transcriptions;
                // send the material to the next component
                return this._onEmit(material, stream_id, callback);
            });
        } catch (error) {
             // unable to process the material
             material.message = `${this._prefix} ${error.message}`;
             return this._onEmit(material, 'incomplete', callback);
        }

    }
}

exports.create = function (context) {
    return new ExtractVideoRaw(context);
};