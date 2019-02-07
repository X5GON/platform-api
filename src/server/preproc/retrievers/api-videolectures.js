/**********************************************************
 * Videolectures API
 * This class is used to retrieve lecture metadata
 * from Videolectures.NET.
 */

// import basic api class
const BasicRESTAPI = require('./api-rest-basic');

// create an videolectures data retrieval class
class VideolecturesAPI extends BasicRESTAPI {

    /**
     * Initialize the Videolectures API class.
     * @param {Object} args - The constructor parameters.
     * @param {String} args.apikey - The key used to make the request.
     * @param {Function} args.callback - The callback how to process the material.
     * @param {Object} args.pg - The postgres connection object.
     */
    constructor(args) {
        // set domain for crawling
        super(args);
        this._domain = 'http://videolectures.net';
        this._apikey = args.apikey || null;
    }

    /**
     * Makes a GET request.
     * @param {String} url - The slug of the videolectures.
     * @param {Function} cb - Function specifying what to do with the data.
     */
    get(url, cb) {
        if (!url) {
            const error = new Error('[API-Videolectures get] url not provided');
            return cb(error);
        }

        // extract the slug from the full material provider
        const slug = url.split('/')[3];
        // setup the url to get the videolectures metadata
        const lectureURL = `${this._domain}/site/api/lectures?apikey=${this._apikey}&slug=${slug}`;

        // get the lecture information
        super.get(lectureURL).then(lecture => {
            if (!lecture || (!lecture.results && !lecture.results[0])) {
                throw new Error(`[API-Videolectures get] lecture not found for url=${url}`);
            }

            // set a placeholder for requests
            let materialRequests = [];
            // get the materials and fetch them for processing
            const materials = lecture.results[0];
            for (let video of materials.videos) {
                const videoURL = `${this._domain}/site/api/videos/${video.id}?apikey=${this._apikey}`;
                materialRequests.push(super.get(videoURL));
            }
            // return the material requests
            Promise.all(materialRequests).then(content => {
                if (!content) {
                    throw new Error(`[API-Videolectures get] no content found for url=${url}`);
                }

                // create a container for oer materials
                let OERMaterials = [];
                // go through all attachments
                for (let attachments of content) {
                    // go through all attachments
                    for (let file of attachments.attachments) {
                        const display = file.type_display;
                        if (display && (display.includes('Slide Presentation') || display.includes('generic video source'))) {
                            const oerMaterial = this._prepareMaterial(materials, file);
                            OERMaterials.push(oerMaterial);
                        }

                    }
                }
                // return the material through the callback
                return cb(null, OERMaterials);
            }).catch(error => cb(error));

        }).catch(error => cb(error));
    }

    /**
     * Starts the crawling process.
     */
    start() {
        let self = this;
        // make crawling enabled
        self._enabled = true;

        // setup the crawling interval
        self._interval = setInterval(() => {
            self._fetchLecture(`${self._domain}/site/api/lectures?apikey=${self._apikey}`,
                self._checkMaterialDb()
            );
        }, self._frequency);

        // start crawling the materials
        self._fetchLecture(`${self._domain}/site/api/lectures?apikey=${self._apikey}`,
            self._checkMaterialDb()
        );
    }

    /**
     * Stops the crawling process.
     */
    stop() {
        this._enabled = false;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    /**
     * Changes the crawling frequency and restarts the crawling process.
     * @param {Number} params.frequency - The crawling frequency.
     * @param {Function} params.callback - The material processing callback.
     */
    update(params) {
        const { frequency, callback } = params;
        this._frequency = frequency || this._frequency;
        this._processCb = callback || this._processCb;
        // stop and restart the crawling
        this.stop(); this.start();
    }

    ///////////////////////////////////////////////////////
    // Helper Functions
    ///////////////////////////////////////////////////////

    /**
     * @description Formats the videolectures material.
     * @param {Object} material - The material object.
     * @param {Object} file - The file object - contains the information about
     * the file metadata.
     * @returns {Object} The formatted material object from Videolectures.
     */
    _prepareMaterial(material, file) {
        // get values from the material and file object that are used
        const { title, description, slug, authors, language, time } = material;
        const { src, ext, mimetype } = file;

        // return the material object
        return {
            title,
            description,
            provideruri: `${this._domain}/${slug}/`,
            materialurl: src,
            author: authors.join(','),
            language: language,
            type: { ext, mime: mimetype },
            datecreated: time,
            dateretrieved: (new Date()).toISOString(),
            providermetadata: {
                title: 'Videolectures.NET',
                url: this._domain
            },
            license: 'Creative Commons Attribution-Noncommercial-No Derivative Works 3.0'
        };
    }

    /**
     * Get all videolectures.net material.
     * @param {Object} url - The videolectures material url to crawl from.
     * @param {Object} cb - The callback what to do with the acquired lecture.
     */
    _fetchLecture(url, cb) {
        let self = this;
        super.get(url).then(lectures => {
            if (!lectures || !lectures.results) {
                throw new Error(`[API-Videolectures _fetchLecture] lectures not found for url=${url}`);
            }

            const openLectures = lectures.results
                .filter(lecture => lecture.enabled && lecture.public);

            // process the lecture results - show only enabled and public materials
            cb(null, openLectures);

            // if there are other materials process them as well
            if (self._enabled && lectures.next) {
                self._fetchLecture(lectures.next, cb);
            }
        }).catch(error => cb(error));
    }

    /**
     * Checks if the material is present in the database.
     * @param {Object|Null} error - The error object.
     * @param {Object[]} materials - The materials to be checked in the database.
     */
    _checkMaterialDb() {
        let self = this;

        return function (error, materials) {
            // handle the error
            if (error) { return self._processCb(error); }

            // go through the materials and check if they already exist
            for (let material of materials) {
                // check if material is in the database
                const url = `${self._domain}/${material.slug}/`;
                self._pg.select({ url }, 'urls', (xerror, results) => {
                    if (xerror) { return self._processCb(xerror); }

                    // TODO: handle existing materials
                    if (results.length) {
                        const yerror = new Error(`[API-Videolectures _checkMaterialDb] material already in dataset url=${url}`);
                        console.log(yerror.message);
                        return;
                    }

                    // get the material and send it to the callback
                    self.get(url, self._processCb);
                });
            }
        };
    }


}

module.exports = VideolecturesAPI;
