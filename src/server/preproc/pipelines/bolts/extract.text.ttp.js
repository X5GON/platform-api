/********************************************************************
 * Extraction: TTP
 * This component makes a request to the UPV's Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the video content as raw text and dfxp.]
 */

// external modules
const rp = require('request-promise-native');

// normalization module
const normalization = require('@library/normalization');


// file management module
const fileManager = require('@library/file-manager');
// module for path creation
const path = require('path');
// archive required modules
const fs = require('fs');
const archiver = require('archiver');
// module for md5 hashing
const crypto = require('crypto');


/**
 * @class ExtractionTTP
 * @description Extracts transcriptions and translations from the
 * provided videos. Supported languages are: english, spanish,
 * german, and slovene.
 */
class ExtractTextTTP {

    constructor() {
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
            user: config.user,
            auth_token: config.token
        };

        // the url of the TTP platform
        this._url = config.url || 'https://ttp.mllp.upv.es/api/v3/text';

        // the default languages for transcriptions and translations
        this._languages = config.languages || {
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
        this._formats = config.formats || {
            3: 'plain'
        };

        // the default timeout when checking status
        this._timeout = config.timeout || 2 * 60 * 1000;
        this._setTimeout = null;

        // create the postgres connection
        this._pg = require('@library/postgresQL')(config.pg);

        this._tmp_folder = config.tmp_folder;
        // create the temporary folder
        fileManager.createDirectoryPath(this._tmp_folder);

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

                if (status_code === 3) {
                    // handle successful process
                    return { process_completed: true };

                } else if (status_code < 3) {
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

            // create the requested langs object
            let requested_langs = JSON.parse(JSON.stringify(self._languages));

            // for non-english lnaguages, we need to set up translation paths
            for (let language of Object.keys(self._languages)) {
                if (language === material.language) {
                    // delete the language
                    delete requested_langs[language];
                } else if (material.language !== 'en' && language !== 'en') {
                    // set the translation path for the given language
                    requested_langs[language].tlpath = [
                        { 'l': 'en' },
                        { 'l': language }
                    ];
                }
            }

            // store the allowed languages and formats
            const languages = Object.keys(requested_langs);
            const formats   = Object.keys(self._formats);

            // generate the md5 hash for file checking
            const md5 = crypto.createHash('md5').update(material.material_metadata.raw_text).digest("hex");

            // setup options for sending the video to TPP
            const options = Object.assign({ }, self._options, {
                manifest: {
                    language: material.language,
                    documents: [{
                        external_id,
                        title: normalization.normalizeString(material.title),
                        filename: 'material.txt',
                        fileformat: 'txt',
                        md5
                    }],
                    // translations
                    requested_langs
                }
            });

            //create temporary files and zip them uncompressed
            const rootPath = path.join(this._tmp_folder, `${external_id}`);
            // create the temporary file directory
            fileManager.createDirectoryPath(rootPath);
            // create a file with the material raw text
            const txtPath = path.join(rootPath, 'material.txt');
            fs.writeFileSync(txtPath, material.material_metadata.raw_text);

            // write the manifest json in the file
            const jsonPath = path.join(rootPath, 'manifest.json');
            fs.writeFileSync(jsonPath, JSON.stringify(options));

            // create a zip file containing the material and manifest
            const documentPackagePath = path.join(rootPath, 'document-package.zip')
            var documentPackage = fs.createWriteStream(documentPackagePath);
            const archive = archiver('zip', { zlip: { level: 0 } });

            // listen for all archive data to be written
            // 'close' event is fired only when a file descriptor is involved
            documentPackage.on('close', function() { });

            // This event is fired when the data source is drained no matter what was the data source.
            // It is not part of this library but rather from the NodeJS Stream API.
            // @see: https://nodejs.org/api/stream.html#stream_event_end
            documentPackage.on('end', function() {
                console.log('Data has been drained');
            });

            // good practice to catch warnings (ie stat failures and other non-blocking errors)
            archive.on('warning', function(err) {
                if (err.code === 'ENOENT') {
                    // log warning
                } else {
                    // throw error
                    throw err;
                }
            });

            // pipe archive data to the file
            archive.pipe(documentPackage);

            archive.file(txtPath, { name: 'material.txt' });

            archive.finalize().then(() => {
                // save the configurations
                this._pg.upsert({
                    url: material.material_url,
                    status: 'text translations waiting',
                    config: {
                        ttp_manifest: options
                    }
                }, {
                    url: material.material_url
                }, 'material_process_queue', () => {});


                rp({
                    method: 'POST',
                    uri: `${self._url}/ingest/new`,
                    formData: {
                        json: fs.createReadStream(jsonPath),
                        pkg: fs.createReadStream(documentPackagePath)
                    },
                    json: true
                }).then(({ rcode, id }) => {
                    // after the request remove the zip files
                    fileManager.removeFolder(rootPath);
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

                }).then(translations => {
                    /////////////////////////////////////////////////////////
                    // THIRD STEP
                    // Go through the transcription list, prepare material
                    // metadata and save it in the material object

                    // prepare placeholders for material metadata
                    let transcriptions = { };

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
                                JSON.parse(translations[index]);
                            } catch (err) {
                                // if here, the response is a text file, dfxp or plain
                                if (typeof translations[index] === 'string') {
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
                    transcriptions[material.language] = {
                        plain: material.material_metadata.raw_text
                    };

                    // save transcriptions into the material's metadata field
                    material.material_metadata.transcriptions = transcriptions;
                    material.material_metadata.ttp_id         = external_id;
                    return this._changeStatus(material, stream_id, callback);

                }).catch(e => {
                    // log error message and store the not completed material
                    material.message = `${self._prefix} ${e.message}`;
                    return this._changeStatus(material, 'incomplete', callback);
                });

            });
        }
    }

    /**
     * Changes the status of the material process and continues to the next bolt.
     * @param {Object} material - The material object.
     * @param {String} stream_id - The stream ID.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(material, stream_id, callback) {
        const error = stream_id === 'incomplete' ? ' error' : '';
        return this._pg.update(
            { status: `text translations${error}` },
            { url: material.material_url },
            'material_process_queue', () => {
                // send material object to next component
                return this._onEmit(material, stream_id, callback);
            }
        );
    }

}

exports.create = function (context) {
    return new ExtractTextTTP(context);
};