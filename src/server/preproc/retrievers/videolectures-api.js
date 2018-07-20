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
        args.domain = 'http://videolectures.net/';
        super(args);
    }

    /**
     * Makes a GET request.
     * @param {String} slug - The slug of the videolectures.
     * @returns {Promise} The promise of returning the response.
     */
    get(url, callback) {
        if(!url) {
            return callback(new Error('VideolecturesAPI.get(slug): slug parameter must be provided'));
        }

        // extract slug
        const slug = url.split('/')[3];

        // set up the url to get the videolectures metadata
        const materialURL = `${this.domain}/site/api/lectures?apikey=${this.apikey}&slug=${slug}`;
        // get the lecture metadata
        super.get(materialURL).then(response => {
            if (!response || !response.results[0]) {
                return callback(new Error('VideolecturesAPI.get(slug): material not found'));
            }

            const material = response.results[0];
            if (!material.videos.length) {
                return callback(new Error('VideolecturesAPI.get(slug): material does not have any videos'));
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
                        const error = new Error('VideolecturesAPI.get(slug): no content found for material');
                        return callback(error, material);
                    }

                    // include attachments to corresponding video
                    for (let attachments of content) {
                        for (let video of material.videos) {
                            if (video.id === attachments.id) { video.attachments = attachments; }
                        }
                    }

                    // return the material through the callback
                    return callback(null, material);

                }).catch(error => { return callback(error); });

        }).catch(error => { return callback(error); });
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