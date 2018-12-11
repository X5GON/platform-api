/********************************************************************
 * Extraction: TTP
 * This component makes a request to the UPV's Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the video content as raw text and dfxp.]
 */

// external modules
const rp = require('request-promise-native');

/**
 * @class ExtractionTTP
 * @description Extracts transcriptions and translations from the
 * provided videos. Supported languages are: english, spanish,
 * german, and slovene.
 */
class ExtractionTTP {

    constructor() {
        this._name = null;
        this._context = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ExtractionTTP ${this._name}]`;

        // the user and authentication token used for the requests
        this._options = {
            user: config.user,
            auth_token: config.token
        };

        // the url of the TTP platform
        this._url = config.url || 'https://ttp.mllp.upv.es/api/v3/speech';

        // the default languages for transcriptions and translations
        this._languages = config.languages || {
            es: { sub: {} },
            en: { sub: {} },
            sl: { sub: {} },
            de: { sub: {} }
        };

        // the transcription formats
        this._formats = config.formats || {
            0: 'dfxp',
            4: 'plain'
        };

        // the default timeout when checking status
        this._timeout = config.timeout;
        this._setTimeout = null;

        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        clearTimeout(this._setTimeout);
        callback();
    }


    receive(material, stream_id, callback) {
        let self = this;

        /**
         * @description Iteratively check for the process status.
         * @param {string} id - Material process id.
         * @returns {Object} The object containing information about the status.
         */
        function _checkTTPStatus(id) {
            // make a request to check the status of the material process
            const request = new Promise((resolve, reject) => {

                // save the timeout object for later reference
                self._setTimeout = setTimeout(function () {
                    rp({
                        uri: `${self._url}/status`,
                        qs: Object.assign({ }, this._options, { id }),
                        json: true
                    })
                    .then(xparams => resolve(xparams))
                    .catch(e => reject(e));

                }, self._timeout);
            });

            // check for the process status
            return request.then(processStatus => {
                const { status_code, id: processId } = processStatus;

                if (status_code === 6) {
                    // handle successful process
                    return { process_completed: true };

                } else if (status_code < 6) {
                    // the process has not been finished
                    return _checkTTPStatus(id);

                } else {
                    // the process has encountered an error
                    return {
                        process_completed: false,
                        status_code_msg: status_code < 100 ?
                            'unexpected-process-message' :
                            'Error on TTP side',
                        process_id: processId,
                        status_code
                    };
                }
            });
        }


        /////////////////////////////////////////////////////////////
        // Start Processing materials
        /////////////////////////////////////////////////////////////


        if (Object.keys(this._languages).includes(material.language)) {
            /////////////////////////////////////////////////////////
            // FIRST STEP
            // Prepare material options, send them to TTP and wait
            // for the material to be processed

            // external_id generation - for using in TTP
            const external_id = Math.random().toString(36).substring(2, 15) +
                                Math.random().toString(36).substring(2, 15) +
                                Date.now();


            // setup options for sending the video to TPP
            const options = Object.assign({ }, this._options, {
                manifest: {
                    media: {
                        url: material.materialUrl
                    }
                },
                metadata: {
                    // external_id equals to material url
                    external_id: external_id,
                    language: material.language,
                    title: material.title,
                    speakers: [{
                        speaker_id: material.author || 'unknown',
                        speaker_name: material.author || 'unknown'
                    }]
                },
                // transcription and translation languages
                requested_langs: this._languages
            });


            // send request to TTP
            rp({
                method: 'POST',
                uri: `${self._url}/ingest/new`,
                body: options,
                json: true
            }).then(({ rcode, id }) => {
                if (rcode === 0) {
                    // check for status of the process
                    return _checkTTPStatus(id);
                } else {
                    // something went wrong with the upload - terminate process
                    throw new Error(`[status_code: ${rcode}] Error when uploading process_id=${id}`);
                }
            }).then(processResponse => {
                /////////////////////////////////////////////////////////
                // SECOND STEP
                // If the material has been processed, make a request
                // for all transcriptions and translations

                if (processResponse.process_completed) {
                    // get processed values - transcriptions and translations

                    const languages = Object.keys(this._languages);
                    const formats = Object.keys(this._formats);

                    let requests = [];
                    // iterate through all languages
                    for (let lang of languages) {
                        // iterate through all formats
                        for (let format of formats) {
                            // prepare the requests to get the transcriptions and translations
                            let request = rp({
                                uri: `${self._url}/get`,
                                qs: Object.assign({ }, this._options, {
                                    id: external_id,
                                    format,
                                    lang
                                }),
                            });
                            // store it for later
                            requests.push(request);
                        }
                    }

                    // wait for all requests to go through
                    return Promise.all(requests);

                } else {
                    const { status_code_msg, status_code, process_id } = processResponse;
                    // the process has not been successfully completed
                    throw new Error(`[status_code: ${status_code}] ${status_code_msg} for process_id=${process_id}`);
                }
            }).then(transcriptionList => {
                /////////////////////////////////////////////////////////
                // THIRD STEP
                // Go through the transcription list, prepare material
                // metadata and save it in the material object

                // prepare placeholders for material metadata
                let transcriptions = { };
                let rawText;
                let dfxp;

                // iterate through all responses
                for (let langId = 0; langId < languages.length; langId++) {
                    // get current language
                    const lang = languages[langId];
                    // placeholder for transcriptions
                    let transcription = { };

                    for (let formatId = 0; formatId < formats.length; formatId++) {
                        // get current format
                        const format = self._formats[formats[formatId]];
                        // get index of the current transcription value
                        let index = langId * formats.length + formatId;

                        try {
                            // try if the response is a JSON
                            const response = JSON.parse(transcriptionList[index]);
                            // if object - contains error message
                        }catch (err) {
                            // if error - the response is a string
                            if (typeof transcriptionList[index] === 'string') {
                                transcription[format] = transcriptionList[index];
                            }
                        }

                    }

                    if (Object.keys(transcription)) {
                        // save transcriptions under the current language
                        transcriptions[lang] = transcription;

                        if (lang === material.language) {
                            // set default transcriptions for the material
                            rawText = transcription.plain;
                            dfxp = transcription.dfxp;
                        }
                    }
                }

                // save transcriptions into the material's metadata field
                material.materialMetadata.dfxp = dfxp;
                material.materialMetadata.rawText = rawText;
                material.materialMetadata.transcriptions = transcriptions;

                // send material to the next component
                return this._onEmit(material, stream_id, callback);

            }).catch(e => {
                // TODO: log error message and store the not completed material
                return this._onEmit(material, 'stream_partial', callback);
            });

        } else {
            // TODO: handle videos for which we don't know the language
            // probably store them in a different table - one containing
            // one containing incomplete & unhandled materials

            // TODO: log material
            return this._onEmit(material, 'stream_partial', callback);
        }
    }
}

exports.create = function (context) {
    return new ExtractionTTP(context);
};