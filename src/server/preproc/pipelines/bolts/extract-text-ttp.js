/** ******************************************************************
 * Extract Text Translations via TTP
 * This component makes a request to the UPV"s Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the text translations.]
 */

// external modules
const rp = require("request-promise-native");
// normalization module
const normalization = require("@library/normalization");
// archive required modules
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const crypto = require("crypto");
const fileManager = require("@library/file-manager");

// basic bolt template
const BasicBolt = require("./basic-bolt");

/**
 * @class ExtractionTTP
 * @description Extracts transcriptions and translations from the
 * provided videos. Supported languages are: english, spanish,
 * german, and slovene.
 */
class ExtractTextTTP extends BasicBolt {
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
        this._prefix = `[ExtractTextTTP ${this._name}]`;

        // the user and authentication token used for the requests
        this._options = {
            user: config.ttp.user,
            auth_token: config.ttp.token
        };

        // the url of the TTP platform
        this._TTPUrl = config.ttp.url || "https://ttp.mllp.upv.es/api/v3/text";
        // the default languages for transcriptions and translations
        this._TTPLanguages = config.ttp.languages || {
            es: { }, // spanish
            en: { }, // english
            sl: { }, // slovene
            de: { }, // german
            fr: { }, // french
            it: { }, // italian
            pt: { }, // portuguese
            ca: { }, // catalan
        };
        // the transcription formats
        this._TTPFormats = config.ttp.formats || {
            3: "plain"
        };
        // the default timeout when checking status
        this._TTPTimeoutMillis = config.ttp.timeout_millis || 2 * 60 * 1000;
        this._timeoutObject = null;
        // create the temporary folder
        this._tmp_folder = config.tmp_folder;
        fileManager.createDirectoryPath(this._tmp_folder);

        // the path to where to get the language
        this._documentLanguagePath = config.document_language_path;
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
                        qs: { ...self._options, id },
                        json: true
                    })
                        .then((xparams) => resolve(xparams))
                        .catch((error) => reject(error));
                }, self._TTPTimeoutMillis);
            });

            try {
                const { status_code, status_info } = await request;
                if (status_code === 3) {
                    return { process_completed: true };
                } else if (status_code < 3) {
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
                this.set(message, self._documentErrorPath, `${self._prefix} ${error.message}`);
                return this._onEmit(message, "stream_error", callback);
            }
        }


        // ///////////////////////////////////////////////////////////
        // Start Processing materials
        // ///////////////////////////////////////////////////////////

        const documentLanguage = this.get(message, this._documentLanguagePath);
        if (Object.keys(self._TTPLanguages).includes(documentLanguage)) {
            // ///////////////////////////////////////////////////////
            // FIRST STEP
            // Prepare material options, send them to TTP and wait
            // for the material to be processed

            // external_id generation - for using in TTP
            const external_id = Math.random().toString(36).substring(2, 15)
                                + Math.random().toString(36).substring(2, 15)
                                + Date.now();

            // create the requested langs object
            let requested_langs = JSON.parse(JSON.stringify(self._TTPLanguages));

            // for non-english lnaguages, we need to set up translation paths
            for (let language of Object.keys(self._TTPLanguages)) {
                if (language === documentLanguage) {
                    // delete the language
                    delete requested_langs[language];
                } else if (documentLanguage !== "en" && language !== "en") {
                    // set the translation path for the given language
                    requested_langs[language].tlpath = [
                        { l: "en" },
                        { l: language }
                    ];
                }
            }

            // store the allowed languages and formats
            const languages = Object.keys(requested_langs);
            const formats = Object.keys(self._TTPFormats);

            // generate the md5 hash for file checking
            const documentText = this.get(message, this._documentTextPath);
            const md5 = crypto.createHash("md5")
                .update(documentText)
                .digest("hex");

            const documentTitle = this.get(message, this._documentTitlePath);
            // setup options for sending the video to TPP
            const options = {
                ...self._options,
                manifest: {
                    language: documentLanguage,
                    documents: [{
                        external_id,
                        title: normalization.normalizeString(documentTitle),
                        filename: "material.txt",
                        fileformat: "txt",
                        md5
                    }],
                    // translations
                    requested_langs
                }
            };

            // create temporary files and zip them uncompressed
            const rootPath = path.join(this._tmp_folder, `${external_id}`);
            // create the temporary file directory
            fileManager.createDirectoryPath(rootPath);
            // create a file with the material raw text
            const txtPath = path.join(rootPath, "material.txt");
            fs.writeFileSync(txtPath, documentText);

            // write the manifest json in the file
            const jsonPath = path.join(rootPath, "manifest.json");
            fs.writeFileSync(jsonPath, JSON.stringify(options));

            // create a zip file containing the material and manifest
            const documentPackagePath = path.join(rootPath, "document-package.zip");
            let documentPackage = fs.createWriteStream(documentPackagePath);
            const archive = archiver("zip", { zlip: { level: 0 } });

            // listen for all archive data to be written
            // "close" event is fired only when a file descriptor is involved
            documentPackage.on("close", () => { });

            // This event is fired when the data source is drained no matter what was the data source.
            // It is not part of this library but rather from the NodeJS Stream API.
            // @see: https://nodejs.org/api/stream.html#stream_event_end
            documentPackage.on("end", () => { });

            // good practice to catch warnings (ie stat failures and other non-blocking errors)
            archive.on("warning", (err) => {
                if (err.code === "ENOENT") {
                    // log warning
                } else {
                    // throw error
                    throw err;
                }
            });

            // pipe archive data to the file
            archive.pipe(documentPackage);
            archive.file(txtPath, { name: "material.txt" });

            try {
                await archive.finalize();
                // send the file to the TTP service
                const { rcode, id } = await rp({
                    method: "POST",
                    uri: `${self._TTPUrl}/ingest/new`,
                    formData: {
                        json: fs.createReadStream(jsonPath),
                        pkg: fs.createReadStream(documentPackagePath)
                    },
                    json: true
                });
                // after the request remove the zip files
                fileManager.removeFolder(rootPath);

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
                                ...self._options,
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

                // iterate through all responses
                for (let langId = 0; langId < languages.length; langId++) {
                    // get current language
                    const lang = languages[langId];

                    // placeholder for transcriptions
                    let transcription = { };

                    for (let formatId = 0; formatId < formats.length; formatId++) {
                        const format = self._TTPFormats[formats[formatId]];
                        let index = langId * formats.length + formatId;
                        try {
                            // try if the response is a JSON. If it goes through,
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
                    }
                }

                // add the original language content
                transcriptions[documentLanguage] = {
                    plain: documentText
                };

                // save transcriptions into the material"s metadata field
                this.set(message, this._documentTranscriptionsPath, transcriptions);
                this.set(message, this._TTPIdPath, external_id);

                return this._onEmit(message, stream_id, callback);
            } catch (error) {
                // after the request remove the zip files
                fileManager.removeFolder(rootPath);
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
    return new ExtractTextTTP(context);
};
