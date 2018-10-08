/**********************************************************
 * Videolectures API
 * This class is used to retrieve lecture metadata
 * from Videolectures.NET.
 */

// import basic api class
const BasicAPI = require('./basic-api');

// create an videolectures data retrieval class
class VideolecturesAPI extends BasicAPI {

    /**
     * Initialize the Videolectures API class.
     * @param {Object} args - The constructor parameters.
     * @param {String} args.apikey - The key used to make the request.
     */
    constructor(args) {
        // set domain for crawling
        args.domain = 'http://videolectures.net';
        super(args);
    }

    /**
     * Makes a GET request.
     * @param {String} url - The slug of the videolectures.
     * @param {Function} cb - Function specifying what to do with the data.
     */
    getMaterial(url, cb) {
        if(!url) {
            return cb(new Error('VideolecturesAPI.get(slug): slug parameter must be provided'));
        }

        // extract slug
        const slug = url.split('/')[3];
        // set up the url to get the videolectures metadata
        const materialURL = `${this.domain}/site/api/lectures?apikey=${this.apikey}&slug=${slug}`;

        // get the lecture metadata
        super.get(materialURL).then(response => {
            if (!response || (!response.results && !response.results[0])) {
                return cb(new Error(`VideolecturesAPI.getMaterial(url): material not found - ${url}`));
            }

            const material = response.results[0];
            if (!material.videos.length) {
                return cb(new Error(`VideolecturesAPI.getMaterial(url): material does not have any videos - ${url}`));
            }

            let materialRequests = [];
            // get list of materials associated with material
            for (let video of material.videos) {
                const videoURL = `${this.domain}/site/api/videos/${video.id}?apikey=${this.apikey}`;
                materialRequests.push(super.get(videoURL));
            }

            // wait for all of the requests to go through
            Promise.all(materialRequests)
                .then(content => {
                    if (!content) {
                        const error = new Error(`VideolecturesAPI.getMaterial(url): no content found for material - ${url}`);
                        return cb(error, material);
                    }

                    const oerMaterials = [];
                    // include attachments to corresponding video
                    for (let attachments of content) {
                        for (let file of attachments.attachments) {
                            if (file.type_display && (
                                file.type_display.includes('Slide Presentation') ||
                                file.type_display.includes('Video - generic video source'))) {
                                oerMaterials.push({
                                    title: material.title,
                                    description: material.description,
                                    providerUri: `${this.domain}/${material.slug}/`,
                                    materialUrl: file.src,
                                    author: material.authors,
                                    language: material.language,
                                    type: { ext: file.ext, mime: file.mimetype },
                                    dateCreated: material.time,
                                    dateRetrieved: (new Date()).toISOString(),
                                    providerMetadata: {
                                        title: 'Videolectures.NET',
                                        url: this.domain
                                    },
                                    license: {
                                        title: 'Creative Commons Attribution-Noncommercial-No Derivative Works 3.0',
                                        url: 'https://creativecommons.org/licenses/by-nc-nd/3.0/legalcode'
                                    }
                                });
                            }
                        }
                    }
                    // return the material through the callback
                    return cb(null, oerMaterials);
                }).catch(error => { return cb(error); });
        }).catch(error => { return cb(error); });
    }

    /**
     * Starts the crawling process.
     * @param {Number} frequency - Number of miliseconds before starting the crawling process again.
     * @param {Function} cb - The function used on the response.
     */
    startCrawling(pg, cb) {
        let self = this;
        self._crawlingEnabled = true;
        self._crawlingInterval = setInterval(() => {
            self._getMaterials(`${self.domain}/site/api/lectures?apikey=${self.apikey}`,
                self._checkMaterialDbPresence(pg, cb)
            );
        }, self._crawlingFrequency);
        self._getMaterials(`${self.domain}/site/api/lectures?apikey=${self.apikey}`,
            self._checkMaterialDbPresence(pg, cb)
        );
    }

    /**
     * Stops the crawling process.
     */
    stopCrawling() {
        this._crawlingEnabled = false;
        if (this._crawlingInterval) {
            clearInterval(this._crawlingInterval);
            this._crawlingInterval = null;
        }
    }

    /**
     * Changes the crawling frequency and restarts the crawling process.
     * @param {Number} frequency - The crawling frequency.
     * @param {Object} pg - Postgres connection object.
     * @param {Function} cb - The material processing callback.
     */
    changeCrawlingFrequency(frequency, pg, cb) {
        this._crawlingFrequency = frequency;
        this.stopCrawling();
        this.startCrawling(pg, cb);
    }

    /**
     * Get all videolectures.net material.
     * @param {Object} url - The videolectures url to crawl from.
     * @param {Function} cb - the function specifying what to do with the data.
     */
    _getMaterials(url, cb) {
        let self = this;
        super.get(url).then(response => {
            if (!response || !response.results) {
                return cb(new Error(`VideolecturesAPI._getMaterials(url): materials not found - ${url}`));
            }
            // process the results
            cb(null, response.results.filter(material => material.enabled && material.public));
            // if there are other materials process them as well
            if (self._crawlingEnabled && response.next) { self._getMaterials(response.next, cb); }
        }).catch(error => {
	        return cb(error);
        });
    }

    /**
     * Checks if the material is present in the database.
     * @param {Object} pg - Postgres connection object.
     * @param {Function} cb - The material processing callback.
     */
    _checkMaterialDbPresence(pg, cb) {
        let self = this;
        return function(error, materials) {
            if (error) { cb(error); return; }

            for (let material of materials) {
                // check if material is in the database
                pg.select({ providerUri: `${self.domain}/${material.slug}/` }, 'oer_materials', (xerror, results) => {
                    if (xerror) { cb(xerror); return; }
                    console.log(`${self.domain}/${material.slug}/`);
                    console.log('found results', results);
                    // TODO: handle existing materials
                    if (results.length !== 0) { return; }
                    // get the material and send it to the callback
                    self.getMaterial(`${self.domain}/${material.slug}/`, cb);
                });
            }
        };
    }

    /**
     * Make a POST request.
     * Note: This function is not supported.
     */
    post() {
        return new Error('VideolecturesAPI.post(): not supported');
    }
}

module.exports = VideolecturesAPI;
