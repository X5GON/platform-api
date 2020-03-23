/** ********************************************************
 * Videolectures API
 * This class is used to retrieve lecture metadata
 * from Videolectures.NET.
 */

// import basic api class
const BasicRESTAPI = require("./api-rest-basic");

/**
 * @class VideolecturesAPI
 * @description The class for retrieving videolectures materials.
 */
class VideolecturesAPI extends BasicRESTAPI {
    /**
     * Initialize the Videolectures API class.
     * @param {Object} args - The constructor parameters.
     * @param {String} args.apikey - The API key used to make the request.
     */
    constructor(args) {
        super(args);
        // set retriever parameters
        this._domain = "http://videolectures.net";
        this._apikey = args.apikey || null;
        // enable retriever
        this._enabled = true;
    }

    /**
     * Makes a GET request.
     * @param {String} url - The slug of the videolectures.
     * @param {Function} cb - Function specifying what to do with the data.
     */
    getMaterial(url, cb) {
        let self = this;

        if (!url) {
            const error = new Error("[VideolecturesAPI.getMaterial] url not provided");
            return cb(error);
        }

        // extract the slug from the full material provider
        const slug = url.split("/")[3];
        // setup the url to get the videolectures metadata
        const lectureURL = `${this._domain}/site/api/lectures?apikey=${this._apikey}&slug=${slug}`;

        // get the lecture information
        super.get(lectureURL).then((lecture) => {
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
            Promise.all(materialRequests).then((content) => {
                if (!content) {
                    throw new Error(`[API-Videolectures get] no content found for url=${url}`);
                }

                // create a container for oer materials
                let oer_materials = [];
                // go through all attachments
                for (let attachments of content) {
                    // go through all attachments
                    for (let file of attachments.attachments) {
                        const display = file.type_display;
                        if (display && (display.includes("Slide Presentation") || display.includes("generic video source"))) {
                            const oer_material = this._prepareMaterial({ materials, file, part: attachments.part });
                            // check if the material is already in the database
                            oer_materials.push(new Promise((resolve, reject) => {
                                self._pg.select({ url: oer_material.materialurl }, "material_process_queue", (xerror, results) => {
                                    if (xerror) { return reject(xerror); }
                                    if (results.length === 0) {
                                        // the material is not in the database yet
                                        return resolve(oer_material);
                                    } else {
                                        // the material can be skipped, already in database
                                        return resolve(null);
                                    }
                                });
                            }));
                        }
                    }
                }

                // wait for the materials
                Promise.all(oer_materials).then((materials) => {
                    const newMaterials = materials.filter((material) => material);
                    // return the material through the callback
                    return cb(null, newMaterials);
                }).catch((error) => cb(error));
            }).catch((error) => cb(error));
        }).catch((error) => cb(error));
    }

    /**
     * Enable the retriever.
     */
    start() {
        this._enabled = true;
    }

    /**
     * Stops the retriever.
     */
    stop() {
        this._enabled = false;
    }

    /**
     * Changes the material processing callback and restarts the retriever.
     * @param {Object} params - The update parameters.
     * @param {Function} params.callback - The material processing callback.
     */
    update({ callback }) {
        this._processCb = callback || this._processCb;
        // stop and restart the crawling
        this.stop(); this.start();
    }

    // /////////////////////////////////////////////////////
    // Helper Functions
    // /////////////////////////////////////////////////////

    /**
     * @description Formats the videolectures material.
     * @param {Object} material - The material object.
     * @param {Object} file - The file object - contains the information about
     * the file metadata.
     * @returns {Object} The formatted material object from Videolectures.
     */
    _prepareMaterial(params) {
        // get material metadata
        let {
            materials: {
                title,
                description,
                slug,
                authors,
                language,
                time
            },
            file: {
                src,
                ext,
                mimetype
            },
            part
        } = params;

        // fix mimetype and extension if required
        mimetype = mimetype || super.mimetype(src);
        ext = ext || super.extension(mimetype);

        // return the material object
        return {
            title,
            description,
            provider_uri: `${this._domain}/${slug}/`,
            material_url: src,
            author: authors.join(","),
            language,
            type: {
                ext,
                mime: mimetype
            },
            date_created: time,
            retrieved_date: (new Date()).toISOString(),
            provider_token: this._token,
            material_metadata: {
                metadata: {
                    slug,
                    part
                }
            },
            license: "Creative Commons BY-NC-ND 3.0"
        };
    }

    /**
     * Get all videolectures.net material.
     * @param {Object} url - The videolectures material url to crawl from.
     * @param {Object} cb - The callback what to do with the acquired lecture.
     */
    _fetchLecture(url, cb) {
        let self = this;
        super.get(url).then((lectures) => {
            if (!lectures || !lectures.results) {
                throw new Error(`[API-Videolectures _fetchLecture] lectures not found for url=${url}`);
            }

            const openLectures = lectures.results
                .filter((lecture) => lecture.enabled && lecture.public);

            // process the lecture results - show only enabled and public materials
            cb(null, openLectures);

            // if there are other materials process them as well
            if (self._enabled && lectures.next) {
                self._fetchLecture(lectures.next, cb);
            }
        }).catch((error) => cb(error));
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
                // get the material and send it to the callback
                self.get(url, self._processCb);
            }
        };
    }
}

module.exports = VideolecturesAPI;
