// external modules
const router = require("express").Router();


/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    /** ********************************
     * Helper functions
     ******************************** */

    // TODO: write helper functions

    /** ********************************
     * Routes
     ******************************** */

    router.get("/oer_providers", (req, res) =>
        // TODO: implement the route
        res.send(new Error("Route not implemented")));

    router.get("/oer_providers/:provider_id", (req, res) => {
        // get material id
        const { provider_id } = req.params;

        // TODO: implement the route
        return res.send(new Error("Route not implemented"));
    });


    return router;
};
