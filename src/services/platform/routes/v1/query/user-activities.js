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

    router.get("/user_activities/:user_id", (req, res) => {
        // get material id
        const { user_id } = req.params;

        // TODO: implement the route
        return res.send(new Error("Route not implemented"));
    });

    router.get("/user_activities/:user_id/history", (req, res) => {
        // get material id
        const { user_id } = req.params;

        // TODO: implement the route
        return res.send(new Error("Route not implemented"));
    });

    return router;
};
