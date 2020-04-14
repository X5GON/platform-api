// modules
const express = require("express");
const querystring = require("querystring");
const cors = require("cors");
const bent = require("bent");

const router = express.Router();

module.exports = function (logger, config) {
    // prepare the recommendation request object
    const getRecommendations = bent("GET", `http://127.0.0.1:${config.search.port}`, "json", 200, 302);

    router.get("/api/v2/embed/recommendations", cors(), async (req, res) => {
        const {
            width,
            height,
            fontSize
        } = req.query;

        let options = {
            layout: "emptyV2",
            style: {
                width,
                height,
                fontSize
            },
            empty: true
        };

        let response;
        const queryString = querystring.stringify({
            ...req.query,
            limit: 10
        });

        try {
            response = await getRecommendations(`/api/v1/recommend/oer_bundles?${queryString}`);
        } catch (error) {
            // there is not material found on the url
        }
        if (!response) {
            try {
                response = await getRecommendations(`/api/v1/oer_materials?${queryString}`);
            } catch (error) {
                // error when making material request
                logger.error("[error] request for recommended materials",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                // render the empty list of recommendations
                return res.render("recommendationsV2", options);
            }
        }

        const {
            query,
            rec_materials
        } = response;

        if (query.url) {
            query.url = encodeURIComponent(query.url);
        }
        rec_materials.forEach((material) => {
            material.encoded_website = encodeURIComponent(material.website);
        });
        // prepare the recommender metadata
        options = {
            ...options,
            isEmpty: rec_materials.length === 0,
            query,
            rec_materials,
            recommended_urls: rec_materials.map((material) => encodeURIComponent(material.website))
        };
        console.log(options);
        // render recommendations
        return res.render("recommendationsV2", options);
    });


    // //////////////////////////////////////
    // End of Router
    // //////////////////////////////////////

    return router;
};
