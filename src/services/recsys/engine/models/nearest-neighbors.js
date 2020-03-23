/** **********************************************
 * The Nearest Neighbor recommendation model.
 * It returns documents similar to the query
 * parameter.
 */

// external modules
const qm = require("qminer");
const mimetypes = require("@config/mimetypes");

/**
 * The Nearest Neighbors model class.
 */
class NearestNeighbors {
    /**
     * @description Creates the Nearest Neighbors model class.
     * @param {Object} params - The qminer base containing the data.
     * @param {String} params.mode - The model creation mode. Possible options
     * `create` and `load`.
     * @param {Object} params.base - The qminer base containing the data.
     * @param {String} params.modelPath - The model file path.
     * @param {Object} [params.store] - The store containing the records of interest.
     * Required for creating the model from scratch.
     * @param {Object[]} [params.features] - Array of qminer features used in feature
     * space creation. Required for creating the model from scratch.
     */
    constructor(params) {
        let self = this;
        // parse parameters
        self.params = params;
        // initialize instance based on mode
        if (self.params.mode === "load") {
            // load model from a file
            self._loadModel(
                self.params.base,
                self.params.modelPath,
                self.params.store
            );
        } else if (self.params.mode === "create") {
            // create the model from scratch
            self._createModel(
                self.params.base,
                self.params.modelPath,
                self.params.store,
                self.params.features
            );
        } else {
            throw `Value of parameter 'mode' is not supported: ${self.params.mode}`;
        }
    }

    /**
     * @description Creates the Nearest Neighbor model.
     * @param {Object} base - The qminer base from which the records are taken.
     * @param {String} modelPath - Path where the model is saved.
     * @param {Object} store - The store containing the records of interest.
     * @param {Object[]} features - Array of qminer features used in feature
     * space creation.
     * @private
     */
    _createModel(base, modelPath, store, features) {
        let self = this;
        // create feature space for nearest neighbors
        self.featureSpace = new qm.FeatureSpace(base, features);

        self.store = store;
        // update the feature space and extract record matrix
        const allRecords = self.store.allRecords;
        self.featureSpace.updateRecords(allRecords);

        // create matrix with all materials
        self.matrix = self.featureSpace.extractSparseMatrix(allRecords);
        // store material ids of other types
        self.videoMaterialIds = new qm.la.IntVector();
        self.audioMaterialIds = new qm.la.IntVector();
        self.textMaterialIds = new qm.la.IntVector();


        for (let id = 0; id < allRecords.length; id++) {
            const mimetype = allRecords[id].mimetype;
            // check the type the material falls into
            if (mimetypes.video.includes(mimetype)) {
                self.videoMaterialIds.push(id);
            } else if (mimetypes.audio.includes(mimetype)) {
                self.audioMaterialIds.push(id);
            } else if (mimetypes.text.includes(mimetype)) {
                self.textMaterialIds.push(id);
            } else {
                console.log("Missing mimetype", mimetype);
            }
        }

        // create feature matrix of different material types
        self.matrixVideo = self.matrix.getColSubmatrix(self.videoMaterialIds);
        self.matrixAudio = self.matrix.getColSubmatrix(self.audioMaterialIds);
        self.matrixText = self.matrix.getColSubmatrix(self.textMaterialIds);

        // save the model in the `modelPath` file
        let fout = qm.fs.openWrite(modelPath);

        // save the feature space
        self.featureSpace.save(fout);

        // feature matrices
        self.matrix.save(fout);
        self.matrixVideo.save(fout);
        self.matrixAudio.save(fout);
        self.matrixText.save(fout);

        // content type ids
        self.videoMaterialIds.save(fout);
        self.audioMaterialIds.save(fout);
        self.textMaterialIds.save(fout);

        // close the file
        fout.close();
    }

    /**
     * @description Loads the Nearest Neighbors model.
     * @param {Object} base - The qminer base containing the data.
     * @param {String} modelPath - The Nearest Neighbors model file name.
     * @private
     */
    _loadModel(base, modelPath, store) {
        let self = this;

        self.store = store;
        // load Nearest Neighbor feature space
        const fin = qm.fs.openRead(modelPath);
        self.featureSpace = new qm.FeatureSpace(base, fin);
        // load the feature matrices
        self.matrix = new qm.la.SparseMatrix(); self.matrix.load(fin);
        self.matrixVideo = new qm.la.SparseMatrix(); self.matrixVideo.load(fin);
        self.matrixAudio = new qm.la.SparseMatrix(); self.matrixAudio.load(fin);
        self.matrixText = new qm.la.SparseMatrix(); self.matrixText.load(fin);
        // load the content type ids
        self.videoMaterialIds = new qm.la.IntVector(); self.videoMaterialIds.load(fin);
        self.audioMaterialIds = new qm.la.IntVector(); self.audioMaterialIds.load(fin);
        self.textMaterialIds = new qm.la.IntVector(); self.textMaterialIds.load(fin);
    }

    /**
     * @description Gets Nearest Neighbors of the query.
     * @param {Object} query - The query object. Can be object containing the text or url
     * attributes. When url is present it searches for the material with that url.
     * @param {Object} [query.url] - The url of the material.
     * @param {Object} [query.text] - The text used to find similar content.
     * @param {Object} store - The qminer store used for creating record(s).
     * @param {Number} [maxCount=20] - The maximal neighbor count.
     * @param {Number} [maxSim=1] - Maximum similarity treshold.
     * @param {Number} [minSim=0.01] - Minimal similarity treshold.
     * @return {Array.<Object>} An array where the first element is a record set
     * of relevant solutions and the second element is an array of similarity measures.
     */
    search(query, maxCount = 20, maxSim = 1, minSim = 0.01) {
        let self = this;
        // get store
        const store = self.store;

        try {
            // transform the query json into a sparse vector
            let queryRec;

            if (query.hasOwnProperty("uuid")
                && query.hasOwnProperty("wikipediaConceptNames")
                && query.hasOwnProperty("wikipediaConceptSupport")) {
                const {
                    uuid: uri,
                    wikipediaConceptNames,
                    wikipediaConceptSupport
                } = query;

                // create a user interests record
                queryRec = store.newRecord({
                    uri,
                    // title: null,
                    // description: null,
                    // provider: null,
                    // mimetype: null,
                    // language: null,
                    wikipediaConceptNames,
                    wikipediaConceptSupport
                });
            } else if (query.material_id) {
                // get material by url
                const records = self.params.base.search({
                    $from: "Content",
                    materialId: query.material_id
                });
                queryRec = records.length ? records[0] : store.newRecord({ description: "" });
            } else if (query.url && store.recordByName(query.url)) {
                // get material by url
                queryRec = store.recordByName(query.url);
            } else if (query.text) {
                // create instance with provided text
                queryRec = store.newRecord({ description: query.text });
            }

            if (!queryRec) {
                // there is no record in the record set containing the url
                // return an empty record set with weights
                // TODO: tell the user of the missing record
                return [store.newRecordSet(), []];
            }

            let vector = self.featureSpace.extractSparseVector(queryRec);

            // placeholder for the matrix and type ids
            let matrix;
            let typeIds;

            if (query.type === "video") {
                // video type materials requested
                matrix = self.matrixVideo;
                typeIds = self.videoMaterialIds;
            } else if (query.type === "audio") {
                // audio type materials requested
                matrix = self.matrixAudio;
                typeIds = self.audioMaterialIds;
            } else if (query.type === "text") {
                // text type materials requested
                matrix = self.matrixText;
                typeIds = self.textMaterialIds;
            } else {
                // search among all materials
                matrix = self.matrix;
            }

            // calculate similarities between query vector and content
            let sim = matrix.multiplyT(vector);
            let sort = sim.sortPerm(false);
            let idVec = qm.la.IntVector();
            let simVec = [];

            if (maxCount > sort.perm.length) {
                // the threshold is larger than the similarity vector
                maxCount = sort.perm.length;
            }

            for (let i = 0; i < sort.perm.length; i++) {
                // get content id of (i+1)-th most similar content
                let maxid = sort.perm[i];
                // stop if similarity to small
                if (sim[maxid] < minSim) { break; }

                // skip the most similar documents
                if (sim[maxid] > maxSim) { continue; }

                // skip the record used to find recommendations
                if ((query.material_id || query.url) && maxid === queryRec.$id) { continue; }

                // check if the similarity is close to an existing one
                let toSimilar = false;
                for (let s of simVec) {
                    if (Math.abs(s - sim[maxid]) < 0.01) { toSimilar = true; break; }
                }
                // there is already one similar document
                if (toSimilar) { continue; }

                // else remember the content and it's similarity
                idVec.push(typeIds ? typeIds[maxid] : maxid);
                simVec.push(sim[maxid]);

                // stop retrieving the documents
                if (simVec.length === maxCount) { break; }
            }

            // return the record set and their similarities
            return [store.newRecordSet(idVec), simVec];
        } catch (error) {
            return { error: error.message };
        }
    }
}

module.exports = NearestNeighbors;
