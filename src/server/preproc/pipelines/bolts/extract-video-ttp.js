/** ******************************************************************
 * Extract Video Transcriptions and Translations via TTP
 * This component makes a request to the UPV's Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the video content as raw text and dfxp.]
 */

// external modules
const rp = require("request-promise-native");
const normalization = require("@library/normalization");

// basic bolt template
const BasicBolt = require("./basic-bolt");


/**
 * @class ExtractionTTP
 * @description Extracts transcriptions and translations from the
 * provided videos. Supported languages are: english, spanish,
 * german, and slovene.
 */
class ExtractVideoTTP extends BasicBolt {
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
        this._prefix = `[ExtractVideoTTP ${this._name}]`;

        // the user and authentication token used for the requests
        this._TTPOptions = {
            user: config.ttp.user,
            auth_token: config.ttp.token
        };
        // the url of the TTP platform
        this._TTPUrl = config.ttp_url || "https://ttp.mllp.upv.es/api/v3/speech";
        // the default languages for transcriptions and translations
        this._TTPLanguages = config.ttp_languages || {
            es: { sub: {} }, // spanish
            en: { sub: {} }, // english
            sl: { sub: {} }, // slovene
            de: { sub: {} }, // german
            fr: { sub: {} }, // french
            it: { sub: {} }, // italian
            pt: { sub: {} }, // portuguese
            ca: { sub: {} }, // catalan
        };
        // the transcription formats
        this._TTPFormats = config.ttp_formats || {
            0: "dfxp",
            3: "webvtt",
            4: "plain"
        };
        // the default timeout when checking status
        this._TTPTimeoutMillis = config.ttp_timeout_millis || 5 * 60 * 1000;
        this._timeoutObject = null;

        // the path to where to get the language
        this._documentLanguagePath = config.document_language_path;
        // the path to where to get the url
        this._documentLocationPath = config.document_location_path;
        // the path to where to get the language
        this._documentAuthorsPath = config.document_authors_path || "unknown_authors";
        // the path to where to get the language
        this._documentTitlePath = config.document_title_path || "unknown_title";

        // the path to where to store the text
        this._documentTextPath = config.document_text_path;
        // the path to where to store the transcriptions
        this._documentTranscriptionsPath = config.document_transcriptions_path;
        // the path to where to store the TTP id
        this._TTPIdPath = config.ttp_id_path;

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
        clearTimeout(this._timeoutObject);
        callback();
    }


    async receive(message, stream_id, callback) {
        let self = this;

        /**
         * @description Iteratively check for the process status.
         * @param {string} id - Material process id.
         * @returns {Object} The object containing information about the status.
         */
        async function _checkTTPStatus(id) {
            // make a request to check the status of the material process
            const request = new Promise((resolve, reject) => {
                // save the timeout object for later reference
                self._timeoutObject = setTimeout(() => {
                    rp({
                        method: "GET",
                        uri: `${self._TTPUrl}/status`,
                        qs: { ...self._TTPOptions, id },
                        json: true
                    })
                        .then((xparams) => resolve(xparams))
                        .catch((error) => reject(error));
                }, self._TTPTimeoutMillis);
            });

            try {
                const { status_code, status_info } = await request;
                if (status_code === 6) {
                    return { process_completed: true };
                } else if (status_code < 6) {
                    return await _checkTTPStatus(id);
                } else {
                    // the process has encountered an error
                    return {
                        process_completed: false,
                        status_code_msg: status_info,
                        process_id: id,
                        status_code
                    };
                }
            } catch (error) {
                // log error message and store the not completed material
                self.set(message, self._documentErrorPath, `${self._prefix} ${error.message}`);
                return this._onEmit(message, "stream_error", callback);
            }
        }


        // ///////////////////////////////////////////////////////////
        // Start Processing materials
        // ///////////////////////////////////////////////////////////

        const documentLanguage = this.get(message, this._documentLanguagePath);
        if (Object.keys(self._TTPLanguages).includes(documentLanguage)) {
            // external_id generation - for using in TTP
            const external_id = Math.random().toString(36).substring(2, 15)
                                + Math.random().toString(36).substring(2, 15)
                                + Date.now();

            // get the documents authors
            const documentAuthors = this.get(message, this._documentAuthorsPath);
            // create the speakers list
            let speakers;
            if (documentAuthors && typeof documentAuthors === "string") {
                // Expectation: documentAuthors = 'author 1, author 2, author 3'
                // split the string of authors and create an array
                speakers = documentAuthors
                    .split(",")
                    .map((author) => ({
                        speaker_id: normalization.normalizeString(author.trim()),
                        speaker_name: normalization.normalizeString(author.trim())
                    }));
            } else if (documentAuthors && typeof documentAuthors === "object") {
                // Expectation: documentAuthors = ['author 1', 'author 2']
                // map the authors into the manifest file
                speakers = documentAuthors
                    .map((author) => ({
                        speaker_id: normalization.normalizeString(author.trim()),
                        speaker_name: normalization.normalizeString(author.trim())
                    }));
            } else {
                // there were no authors provided, create an unknown speaker id
                speakers = [{
                    speaker_id: "unknown",
                    speaker_name: "unknown"
                }];
            }

            // create the requested langs object
            let requestLanguages = JSON.parse(JSON.stringify(self._TTPLanguages));
            const constructedLanguages = Object.keys(requestLanguages)
                .filter((lang) => lang !== "en");

            if (constructedLanguages.includes(documentLanguage)) {
                // for non-english lnaguages, we need to set up translation paths
                for (let language of constructedLanguages) {
                    // if the language is not the material language or english
                    if (language !== "en" && language !== documentLanguage) {
                        // set the translation path for the given language
                        requestLanguages[language].sub.tlpath = [
                            { l: "en" },
                            { l: language }
                        ];
                    }
                }
            }

            // get document location
            const documentLocation = this.get(message, this._documentLocationPath);
            const documentTitle = this.get(message, this._documentTitlePath);
            // setup options for sending the video to TPP
            const options = {
                ...self._TTPOptions,
                manifest: {
                    media: {
                        url: documentLocation
                    },
                    metadata: {
                    // external_id equals to material url
                        external_id,
                        language: documentLanguage,
                        title: normalization.normalizeString(documentTitle),
                        speakers
                    },
                    // transcription and translation languages
                    requested_langs: requestLanguages
                }
            };

            // store the allowed languages and formats
            const languages = Object.keys(self._TTPLanguages);
            const formats = Object.keys(self._TTPFormats);

            try {
                // send the file to the TTP service
                const { rcode, id } = await rp({
                    method: "POST",
                    uri: `${self._TTPUrl}/ingest/new`,
                    body: options,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    json: true
                });

                if (rcode !== 0) {
                    // something went wrong with the upload - terminate process
                    throw new Error(`[status_code: ${rcode}] Error when uploading process_id=${id}`);
                }

                // check for the status of the process
                const {
                    process_completed,
                    status_code_msg,
                    process_id,
                    status_code
                } = await _checkTTPStatus(id);

                if (!process_completed) {
                    // the process has not been successfully completed
                    throw new Error(`[status_code: ${status_code}] ${status_code_msg} for process_id=${process_id}; timestamp: ${Date.now()}`);
                }

                // get processed values - transcriptions and translations
                let requests = [];
                // iterate through all languages
                for (let lang of languages) {
                    // iterate through all formats
                    for (let format of formats) {
                        // prepare the requests to get the transcriptions and translations
                        let request = rp({
                            uri: `${self._TTPUrl}/get`,
                            qs: {
                                ...self._TTPOptions,
                                id: external_id,
                                format,
                                lang
                            },
                        });
                        // store it for later
                        requests.push(request);
                    }
                }

                // wait for all requests to go through
                const translations = await Promise.all(requests);

                // prepare placeholders for material metadata
                let transcriptions = { };
                let raw_text;

                // iterate through all responses
                for (let langId = 0; langId < languages.length; langId++) {
                    // get current language
                    const lang = languages[langId];

                    // placeholder for transcriptions
                    let transcription = { };

                    for (let formatId = 0; formatId < formats.length; formatId++) {
                        // get current format
                        const format = self._TTPFormats[formats[formatId]];
                        // get index of the current transcription value
                        let index = langId * formats.length + formatId;

                        try {
                            // try if the response is a JSON. If goes through,
                            // the response contains the error
                            JSON.parse(translations[index]);
                        } catch (err) {
                            // if here, the response is a text file, dfxp or plain
                            if (typeof translations[index] === "string") {
                                transcription[format] = translations[index];
                            }
                        }
                    }

                    if (Object.keys(transcription)) {
                        // save transcriptions under the current language
                        transcriptions[lang] = transcription;

                        if (lang === documentLanguage) {
                            // set default transcriptions for the material
                            raw_text = transcription.plain;
                        }
                    }
                }

                // save transcriptions into the material's metadata field
                this.set(message, this._documentTextPath, raw_text);
                this.set(message, this._documentTranscriptionsPath, transcriptions);
                this.set(message, this._TTPIdPath, external_id);

                return this._onEmit(message, stream_id, callback);
            } catch (error) {
                // log error message and store the not completed material
                this.set(message, this._documentErrorPath, `${self._prefix} ${error.message}`);
                return this._onEmit(message, "stream_error", callback);
            }
        } else {
            // log the unsupported TTP language
            this.set(message, this._documentErrorPath, `${self._prefix} Not a TTP supported language=${documentLanguage}`);
            return this._onEmit(message, "stream_error", callback);
        }
    }
}

exports.create = function (context) {
    return new ExtractVideoTTP(context);
};
