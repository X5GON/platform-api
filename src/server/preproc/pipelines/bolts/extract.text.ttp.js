/********************************************************************
 * Extraction: TTP
 * This component makes a request to the UPV's Transcription and
 * Translation Platform (TTP) <https://ttp.mllp.upv.es/index.php>
 * and retrieves the video content as raw text and dfxp.]
 */

// external modules
const rp = require('request-promise-native');

// normalization module
const normalization = require('alias:lib/normalization');


// file management module
const fileManager = require('alias:lib/file-manager');
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
            es: { },
            en: { },
            sl: { },
            de: { }
        };

        // the transcription formats
        this._formats = config.formats || {
            3: 'plain'
        };

        // the default timeout when checking status
        this._timeout = config.timeout;
        this._setTimeout = null;

        // create the postgres connection
        this._pg = require('alias:lib/postgresQL')(config.pg);

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
                    requested_langs,
                    test_mode: true
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
            var documentPackage = fs.createWriteStream(path.join(rootPath, 'document-package.zip'));
            const archive = archiver('zip', { zlip: { level: 0 } });

            // listen for all archive data to be written
            // 'close' event is fired only when a file descriptor is involved
            documentPackage.on('close', function() {
                console.log(archive.pointer() + ' total bytes');
                console.log('archiver has been finalized and the output file descriptor has closed.');
            });

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
                    config: {
                        ttp_manifest: options
                    }
                }, {
                    url: material.material_url
                }, 'material_process_pipeline', () => {});

                // after the request remove the zip files
                fileManager.removeFolder(rootPath);

                //! TODO: finish rest of the code

                return self._onEmit(material, stream_id, callback);
            });
        }
    }

}

exports.create = function (context) {
    return new ExtractTextTTP(context);
};