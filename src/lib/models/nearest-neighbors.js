/************************************************
 * The Nearest Neighbor recommendation model.
 * It returns documents similar to the query 
 * parameter.
 */

// external modules
const qm = require("qminer");

/**
 * The Nearest Neighbors model class.
 */
class NearestNeighbors {
    /**
     * @description Creates the Nearest Neighbors model class.
     * @param {Object} params - The qminer base containing the data.
     * @param {String} params.mode - The modal creation mode. Possible options
     * `create` and `load`.
     * @param {Object} params.base - The qminer base containing the data.
     * @param {String} params.modelPath - The model file name.
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
        if (self.params.mode === 'load') {
            // load model from a file
            self._loadModel(self.params.base, self.params.modelPath);
        } else if (self.params.mode === 'create') {
            // create the model from scratch
            self._createModel(self.params.base, self.params.modelPath,
                self.params.store, self.params.features);
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
        // update the feature space and extract record matrix
        self.featureSpace.updateRecords(store.allRecords);
        self.matrix = this.featureSpace.extractSparseMatrix(store.allRecords);

        // save the model in the `modelPath` file
        console.log(modelPath);
        let fout = qm.fs.openWrite(modelPath);
        console.log(fout);
        
        self.featureSpace.save(fout); self.matrix.save(fout); fout.close();
    }

    /**
     * @description Loads the Nearest Neighbors model.
     * @param {Object} base - The qminer base containing the data.
     * @param {String} modelPath - The Nearest Neighbors model file name.
     * @private
     */
    _loadModel(base, modelPath) {
        let self = this;
        // load Nearest Neighbor feature space and matrix
        const fin = qm.fs.openRead(modelPath);
        self.featureSpace = new qm.FeatureSpace(base, fin);
        self.matrix = new qm.la.SparseMatrix(); self.matrix.load(fin);
    }

    /**
     * @description Gets Nearest Neighbors of the query object.
     * @param {Object|String} query - The query object. Can be object containing the `title` and
     * `description` attributes or an url string.
     * @param {Object} store - The qminer store used for creating record(s).
     * @param {Number} [maxCount=100] - The maximal neighbor count.
     * @param {Number} [minSim=0.01] - Minimal similarity treshold.
     * @return {Array.<Object>} An array where the first element is a record set
     * of relevant solutions and the second element is an array of similarity measures.
     */
    search(query, store, maxCount=100, minSim=0.05) {
        let self = this;
        // transform the query json into a sparse vector
        let queryRec = typeof query === 'string' ? 
            store.recordByName(query) :
            store.newRecord(query);

        if (!queryRec) { 
            // there is no record in the record set containing the url
            // return an empty record set with weights
            // TODO: tell the user of the missing record
            return [store.newRecordSet(), []]; 
        }

        let vector = self.featureSpace.extractSparseVector(queryRec);
        // calculate similarities between query vector and content
        let sim = self.matrix.multiplyT(vector);
        let sort = sim.sortPerm(false);
        let idVec = qm.la.IntVector();
        let simVec = [ ];

        if (maxCount > sort.perm.length) {
            // the threshold is larger than the similarity vector
            maxCount = sort.perm.length;
        }

        for (let i = 0; i < maxCount; i++) {
            // get content id of (i+1)-th most similar content
            let maxid = sort.perm[i];
            // stop if similarity to small
            if (sim[maxid] < minSim) { break; }
            // else remember the content and it's similarity
            idVec.push(maxid);
            simVec.push(sim[maxid]);
        }

        // return the record set and their similarities
        return [store.newRecordSet(idVec), simVec];
    }

}

module.exports = NearestNeighbors;
