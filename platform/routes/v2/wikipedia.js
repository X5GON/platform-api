// modules
const express = require("express");
const querystring = require("querystring");
const cors = require("cors");

// validating the query parameters
const { query, param } = require("express-validator");

const router = express.Router();

module.exports = function (pg, logger) {
    /** ********************************
     * Required configuration
     ******************************** */

    const BASE_URL = "https://platform.x5gon.org/api/v2/wikipedia";
    // set the default parameters
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 20;
    const DEFAULT_PAGE = 1;

    /** ********************************
     * Helper functions
     ******************************** */

    function isNull(object) {
        return object === undefined || object === null;
    }

    function wikipediaQuery(params) {
        // extract parameters
        const {
            material_ids,
            wikipedia_ids,
            limit,
            offset
        } = params;

        const afterTableNameAND = !isNull(material_ids) || !isNull(wikipedia_ids) ? "AND" : "";
        const afterMaterialAND = !isNull(material_ids) && !isNull(wikipedia_ids) ? "AND" : "";

        let count = 1;

        // create oer materials query statement
        const query = `
            SELECT
                features_public.*,
                COUNT(*) OVER() AS total_count
            FROM features_public
            WHERE features_public.table_name = 'oer_materials'
            ${afterTableNameAND}
            ${!isNull(material_ids) ? `features_public.record_id IN (${material_ids.map(() => `$${count++}`).join(",")})` : ""}
            ${afterMaterialAND}
            ${!isNull(wikipedia_ids) ? `features_public.id IN (${wikipedia_ids.map(() => `$${count++}`).join(",")})` : ""}

            ORDER BY features_public.id
            ${!isNull(limit) ? `LIMIT ${limit}` : ""}
            ${!isNull(offset) ? `OFFSET ${offset}` : ""}
        `;
        return query;
    }

    function wikipediaFormat(wikipedia) {
        // get content parameters
        const {
            id: wikipedia_id,
            value,
            record_id: material_id
        } = wikipedia;

        // setup content format
        return {
            wikipedia_id,
            material_id,
            value: value.value
        };
    }

    router.get("/api/v2/wikipedia", cors(), [
        query("material_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("wikipedia_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("limit").optional().toInt(),
        query("page").optional().toInt()
    ], async (req, res, next) => {
        // extract the appropriate query parameters
        const {
            material_ids,
            wikipedia_ids,
            limit: queryLimit,
            page: queryPage
        } = req.query;

        // ------------------------------------
        // Set pagination parameters
        // ------------------------------------

        // set default pagination values
        // which part of the materials do we want to query
        const limit = !queryLimit
            ? DEFAULT_LIMIT
            : queryLimit <= 0
                ? DEFAULT_LIMIT
                : queryLimit > MAX_LIMIT
                    ? DEFAULT_LIMIT
                    : queryLimit;

        const page = !queryPage
            ? DEFAULT_PAGE
            : queryPage;

        const offset = (page - 1) * limit;

        req.query.limit = limit;
        req.query.page = page;

        // ------------------------------------
        // Create query
        // ------------------------------------

        // create the query out of the given parameters
        const query = wikipediaQuery({
            material_ids,
            wikipedia_ids,
            limit,
            offset
        });

        // ------------------------------------
        // Create query parameters
        // ------------------------------------

        const parameters = [material_ids, wikipedia_ids]
            .filter((object) => !isNull(object))
            .reduce((prev, curr) => prev.concat(curr), []);

        try {
            // execute the user query
            const records = await pg.execute(query, parameters);

            /** ********************************
             * prepare query results
             ******************************** */

            let total_count;
            if (records.length === 0) {
                total_count = 0;
            } else {
                total_count = parseInt(records[0].total_count, 10);
            }

            // convert the output
            const output = records.map((content) => wikipediaFormat(content));

            // prepare the parameters for the previous query
            const prevQuery = {
                ...req.query,
                ...page && { page: page - 1 }
            };

            // prepare the parameters for the next query
            const nextQuery = {
                ...req.query,
                ...page && { page: page + 1 }
            };

            // prepare the metadata used to navigate through the search
            const totalHits = total_count;
            const totalPages = Math.ceil(total_count / limit);
            const prevPage = page - 1 > 0 ? `${BASE_URL}?${querystring.stringify(prevQuery)}` : null;
            const nextPage = totalPages >= page + 1 ? `${BASE_URL}?${querystring.stringify(nextQuery)}` : null;

            return res.status(200).send({
                query: req.query,
                wikipedia: output,
                metadata: {
                    total_hits: totalHits,
                    total_pages: totalPages,
                    prev_page: prevPage,
                    next_page: nextPage
                }
            });
        } catch (error) {
            logger.error("[error] postgresql error",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            // something went wrong on server side
            return res.status(500).send({
                errors: {
                    msg: "Error on server side"
                }
            });
        }
    });

    router.get("/api/v2/wikipedia/:wikipedia_id", cors(), [
        param("wikipedia_id").optional().toInt()
    ], async (req, res) => {
        // get material and content ids
        const {
            wikipedia_id
        } = req.params;

        // constuct the query
        const query = wikipediaQuery({ wikipedia_ids: [wikipedia_id] });

        try {
            // execute the user query
            const records = await pg.execute(query, [wikipedia_id]);
            /** ********************************
             * prepare query results
             ******************************** */

            // convert the output
            const output = records.map((content) => wikipediaFormat(content));

            return res.status(200).send({
                wikipedia: output[0]
            });
        } catch (error) {
            logger.error("[error] postgresql error",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            // something went wrong on server side
            return res.status(500).send({
                errors: {
                    msg: "Error on server side"
                }
            });
        }
    });

    return router;
};
