// modules
const express = require("express");
const querystring = require("querystring");
const iso6391 = require("iso-639-1");
const cors = require("cors");

// validating the query parameters
const { query, param } = require("express-validator");

const router = express.Router();

module.exports = function (pg, logger) {
    /** ********************************
     * Required configuration
     ******************************** */

    const BASE_URL = "https://platform.x5gon.org/api/v2/oer_contents";
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

    function oerContentsQuery(params) {
        // extract parameters
        const {
            material_ids,
            content_ids,
            languages,
            extensions,
            limit,
            offset
        } = params;

        const conditionsFlag = !isNull(material_ids) || !isNull(content_ids) || !isNull(languages) || !isNull(extensions);
        const afterMaterialAND = !isNull(material_ids) && (!isNull(content_ids) || !isNull(languages) || !isNull(extensions)) ? "AND" : "";
        const afterContentAND = !isNull(content_ids) && (!isNull(languages) || !isNull(extensions)) ? "AND" : "";
        const afterLanguagesAND = !isNull(languages) && !isNull(extensions) ? "AND" : "";

        let count = 1;

        // create oer materials query statement
        const query = `
            SELECT
                material_contents.*,
                COUNT(*) OVER() AS total_count
            FROM material_contents

            ${conditionsFlag ? "WHERE" : ""}
            ${!isNull(material_ids) ? `material_contents.material_id IN (${material_ids.map(() => `$${count++}`).join(",")})` : ""}
            ${afterMaterialAND}
            ${!isNull(content_ids) ? `material_contents.id IN (${content_ids.map(() => `$${count++}`).join(",")})` : ""}
            ${afterContentAND}
            ${!isNull(languages) ? `material_contents.language IN (${languages.map(() => `$${count++}`).join(",")})` : ""}
            ${afterLanguagesAND}
            ${!isNull(extensions) ? `material_contents.extension IN (${extensions.map(() => `$${count++}`).join(",")})` : ""}

            ORDER BY material_contents.id
            ${!isNull(limit) ? `LIMIT ${limit}` : ""}
            ${!isNull(offset) ? `OFFSET ${offset}` : ""}
        `;
        return query;
    }


    function oerContentFormat(oer_content) {
        // get content parameters
        const {
            id: content_id,
            type,
            extension,
            value,
            language,
            material_id
        } = oer_content;

        // setup content format
        return {
            content_id,
            type,
            extension,
            value: value.value,
            lang_short: language,
            lang_long: iso6391.getName(language),
            material_id
        };
    }


    router.get("/api/v2/oer_contents", cors(), [
        query("material_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("content_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("languages").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",") : null)),
        query("extensions").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",") : null)),
        query("limit").optional().toInt(),
        query("page").optional().toInt()
    ], (req, res, next) => {
        // extract the appropriate query parameters
        const {
            material_ids,
            content_ids,
            languages,
            extensions,
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
        const query = oerContentsQuery({
            material_ids,
            content_ids,
            languages,
            extensions,
            limit,
            offset
        });

        // ------------------------------------
        // Create query parameters
        // ------------------------------------

        const parameters = [material_ids, content_ids, languages, extensions]
            .filter((object) => !isNull(object))
            .reduce((prev, curr) => prev.concat(curr), []);

        // execute the user query
        pg.execute(query, parameters, (error, records) => {
            if (error) {
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
            const output = records.map((content) => oerContentFormat(content));

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
                oer_contents: output,
                metadata: {
                    total_hits: totalHits,
                    total_pages: totalPages,
                    prev_page: prevPage,
                    next_page: nextPage
                }
            });
        });
    });


    router.get("/api/v2/oer_contents/:content_id", cors(), [
        param("content_id").optional().toInt()
    ], (req, res) => {
        // get material and content ids
        const {
            content_id
        } = req.params;

        // constuct the query
        const query = oerContentsQuery({ content_ids: [content_id] });

        // execute the user query
        pg.execute(query, [content_id], (error, records) => {
            if (error) {
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

            /** ********************************
             * prepare query results
             ******************************** */

            // convert the output
            const output = records.map((content) => oerContentFormat(content));

            return res.status(200).send({
                oer_contents: output[0]
            });
        });
    });

    router.get("/api/v2/oer_contents/:content_id/content", cors(), [
        param("content_id").optional().toInt()
    ], (req, res) => {
        // get material and content ids
        const {
            content_id
        } = req.params;

        // constuct the query
        const query = oerContentsQuery({ content_ids: [content_id] });

        // execute the user query
        pg.execute(query, [content_id], (error, records) => {
            if (error) {
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

            // send the materials to the user
            return res.status(200).send(records[0].value.value);
        });
    });


    return router;
};
