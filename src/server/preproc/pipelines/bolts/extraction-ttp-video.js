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
class ExtractionTTPVideo {

    constructor() {
        this._name = null;
        this._context = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ExtractionTTPVideo ${this._name}]`;

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

        // create the postgres connection
        this._pg = require('alias:lib/postgresQL')(config.pg);
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
                        method: 'GET',
                        uri: `${self._url}/status`,
                        qs: Object.assign({ }, self._options, { id }),
                        json: true
                    })
                    .then(xparams => resolve(xparams))
                    .catch(error => reject(error));

                }, self._timeout);
            });

            // check for the process status code
            return request.then(({ status_code }) => {

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
                        process_id: id,
                        status_code
                    };
                }
            });
        }


        /////////////////////////////////////////////////////////////
        // Start Processing materials
        /////////////////////////////////////////////////////////////

        if (Object.keys(self._languages).includes(material.language)) {
            /////////////////////////////////////////////////////////
            // FIRST STEP
            // Prepare material options, send them to TTP and wait
            // for the material to be processed

            // external_id generation - for using in TTP
            const external_id = Math.random().toString(36).substring(2, 15) +
                                Math.random().toString(36).substring(2, 15) +
                                Date.now();

            // create the speakers list
            let speakers;
            if (material.author && typeof material.author === 'string') {
                // Expectation: material.author = 'author 1, author 2, author 3'
                // split the string of authors and create an array
                speakers = material.author
                            .split(',')
                            .map(author => ({
                                speaker_id:   author.trim(),
                                speaker_name: author.trim()
                            }));

            } else if (material.author && typeof material.author === 'object') {
                // Expectation: material.author = ['author 1', 'author 2']
                // map the authors into the manifest file
                speakers = material.author
                            .map(author => ({
                                speaker_id:   author.trim(),
                                speaker_name: author.trim()
                            }));

            } else {
                // there were no authors provided, create an unknown speaker id
                speakers = [{
                    speaker_id:   'unknown',
                    speaker_name: 'unknown'
                }];
            }

            // create the requested langs object
            let requested_langs = self._languages;
            const constructedLanguages = Object.keys(requested_langs)
                                .filter(lang => lang !== 'en');

            if (constructedLanguages.includes(material.language)) {
                // for non-english lnaguages, we need to set up translation paths
                for (let language of constructedLanguages) {
                    // if the language is not the material language or english
                    if (language !== 'en' && language !== material.language) {
                        // set the translation path for the given language
                        requested_langs[language].sub.tlpath = [
                            { 'l': 'en' },
                            { 'l': language }
                        ];
                    }
                }
            }

            // setup options for sending the video to TPP
            const options = Object.assign({ }, self._options, {
                manifest: {
                    media: {
                        url: material.materialurl
                    },
                    metadata: {
                        // external_id equals to material url
                        external_id: external_id,
                        language: material.language,
                        title: material.title,
                        speakers
                    },
                    // transcription and translation languages
                    requested_langs
                }
            });

            // store the allowed languages and formats
            const languages = Object.keys(self._languages);
            const formats = Object.keys(self._formats);

            // save the configurations
            this._pg.upsert({
                url: material.materialurl,
                config: {
                    ttp_manifest: options
                }
            }, {
                url: material.materialurl
            }, 'material_process_pipeline', () => {});

            ///////////////////////////////////////////////
            // Start the TTP process

            rp({
                method: 'POST',
                uri: `${self._url}/ingest/new`,
                body: options,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            }).then(({ rcode, id }) => {
                if (rcode === 0) {
                    // check for status of the process
                    return _checkTTPStatus(id);
                } else {
                    // something went wrong with the upload - terminate process
                    throw new Error(`[status_code: ${rcode}] Error when uploading process_id=${id}`);
                }
            }).then(response => {
                /////////////////////////////////////////////////////////
                // SECOND STEP
                // If the material has been processed, make a request
                // for all transcriptions and translations

                if (response.process_completed) {
                    // get processed values - transcriptions and translations
                    let requests = [];
                    // iterate through all languages
                    for (let lang of languages) {
                        // iterate through all formats
                        for (let format of formats) {
                            // prepare the requests to get the transcriptions and translations
                            let request = rp({
                                uri: `${self._url}/get`,
                                qs: Object.assign({ }, self._options, {
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
                    const { status_code_msg, status_code, process_id } = response;
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
                            // try if the response is a JSON. If goes through,
                            // the response contains the error
                            JSON.parse(transcriptionList[index]);

                        }catch (err) {
                            // if here, the response is a text file, dfxp or plain
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
                        }
                    }
                }

                // save transcriptions into the material's metadata field
                material.materialmetadata.rawText        = rawText;
                material.materialmetadata.transcriptions = transcriptions;

                return this._pg.update({ status: this._prefix }, { url: material.materialurl }, 'material_process_pipeline', () => {
                    // send material to the next component
                    return self._onEmit(material, stream_id, callback);
                });


            }).catch(e => {
                // log error message and store the not completed material
                material.message = `${self._prefix} ${e.message}`;
                return this._pg.update({ status: this._prefix }, { url: material.materialurl }, 'material_process_pipeline', () => {
                    // send material to the next component
                    return self._onEmit(material, 'stream_partial', callback);
                });

            });

        } else {
            // log the unsupported TTP language
            material.message = `${self._prefix} Not TTP supported language=${material.language}.`;
            return this._pg.update({ status: this._prefix }, { url: material.materialurl }, 'material_process_pipeline', () => {
                // send material to the next component
                return self._onEmit(material, 'stream_partial', callback);
            });
        }
    }
}

exports.create = function (context) {
    return new ExtractionTTPVideo(context);
};