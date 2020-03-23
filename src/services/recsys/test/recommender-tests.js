/** ************************************************************
 *
 * UNIT TESTS FOR RECOMMENDER ENGINE
 *
 */


const assert = require("assert");
const path = require("path");
const x5recommend = require("../engine/x5recommend.js");

describe("recommender-tests.js: Recommender engine model unit tests.", function () { // describe L1
    this.slow(400);

    before((done) => {
        done();
    });

    after((done) => {
        recsys.close();
        done();
    });

    let recsys;

    it("Should load the recommender engine", function (done) {
        let SLOW_TIME = 200000;
        this.slow(SLOW_TIME);

        recsys = new x5recommend({
            mode: "readOnly",
            path: path.join(__dirname, "../../../../data/recsys"),
            env: "test"
        });
        this.timeout(SLOW_TIME);
        assert.ok(recsys);
        done();
    });

    describe("Empty queries.", () => {
        it("Should handle an empty query", (done) => {
            let expected = {
                error: "Missing query"
            };
            let recommendations = recsys.recommend();

            recommendations.catch((error) => {
                assert.deepEqual(expected, error);
                done();
            });
        });

        it("Should handle an empty query object", (done) => {
            let expected = {
                error: "Unsupported recommendation parameters"
            };
            let recommendations = recsys.recommend({});
            recommendations.catch((error) => {
                assert.deepEqual(expected, error);
                done();
            });
        });
    });

    describe("Text queries.", () => { // describe L2
        it("Should handle an empty text query", (done) => {
            let expected = {
                error: "Unsupported recommendation parameters"
            };
            let query = {
                text: ""
            };
            let recommendations = recsys.recommend(query);
            recommendations.catch((error) => {
                assert.deepEqual(expected, error);
                done();
            });
        });

        it("Should handle a text query", (done) => {
            let query = {
                text: "deep learning"
            };
            let recommendations = recsys.recommend(query);
            recommendations.then((results) => {
                assert.ok(results);
                done();
            });
        });
    }); // describe L2

    describe("URL queries.", () => { // describe L2
        it("Should handle an empty url query", (done) => {
            let expected = {
                error: "Unsupported recommendation parameters"
            };
            let query = {
                url: ""
            };
            let recommendations = recsys.recommend(query);
            recommendations.catch((error) => {
                assert.deepEqual(expected, error);
                done();
            });
        });

        it("Should handle a non-existing url query", (done) => {
            let expected = [];
            let query = {
                url: "http://videolectures.net/kdd2016_broder_deep/"
            };
            let recommendations = recsys.recommend(query);
            recommendations.then((results) => {
                assert.deepEqual(expected, results);
                done();
            });
        });

        it("Should handle an url query", (done) => {
            let query = {
                url: "http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf"
            };
            let recommendations = recsys.recommend(query);
            recommendations.then((results) => {
                assert.ok(results);
                done();
            });
        });
    }); // describe L2

    describe("Text and URL queries.", () => { // describe L2
        it("Should handle an empty text and url query", (done) => {
            let expected = {
                error: "Unsupported recommendation parameters"
            };
            let query = {
                text: "",
                url: ""
            };
            let recommendations = recsys.recommend(query);
            recommendations.catch((error) => {
                assert.deepEqual(expected, error);
                done();
            });
        });

        it("Should handle a text and an empty url query as text query", (done) => {
            let textQuery = {
                text: "deep learning"
            };
            let expected = recsys.recommend(textQuery);
            let query = {
                text: "deep learning",
                url: ""
            };
            let recommendations = recsys.recommend(query);
            Promise.all([expected, recommendations]).then((results) => {
                assert.deepEqual(results[0], results[1]);
                done();
            });
        });

        it("Should handle an empty text and a full url query as text query", (done) => {
            let urlQuery = {
                url: "http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf"
            };
            let expected = recsys.recommend(urlQuery);
            let query = {
                text: "",
                url: "http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf"
            };
            let recommendations = recsys.recommend(query);

            Promise.all([expected, recommendations]).then((results) => {
                assert.deepEqual(results[0], results[1]);
                done();
            });
        });

        // this test fails because URL from query is different that provider uris used to index the material
        it("Should handle a text and url query as url query", (done) => {
            let urlQuery = {
                url: "http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf"
            };
            let expected = recsys.recommend(urlQuery);

            let query = {
                text: "deep learning",
                url: "http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf"
            };
            let recommendations = recsys.recommend(query);
            Promise.all([expected, recommendations]).then((results) => {
                assert.equal(results[0].length, results[1].length);
                for (let id = 0; id < results[0].length; id++) {
                    assert.deepEqual(results[0][id], results[1][id]);
                }
                done();
            });
        });
    }); // describe L2

    describe("Personalized recommendations.", () => { // describe L2

        // TODO: personalized recommendations are returned as promises - write tests that handle promises.
    });
}); // end describe L1
