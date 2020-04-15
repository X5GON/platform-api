// external modules
const express = require("express");
const querystring = require("querystring");
const iso6391 = require("iso-639-1");
const cors = require("cors");
const bent = require("bent");

// validating the query parameters
const { query, param } = require("express-validator");

// configurations
const mimetypes = require("../../config/mimetypes");

const router = express.Router();

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    /** ********************************
     * Required configuration
     ******************************** */

    const BASE_URL = "https://platform.x5gon.org/api/v2/oer_materials";
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

    function getTypeMimetypes(types) {
        if (!types) { return null; }

        let queryMimetypes = [];
        for (const type of types) {
            if (mimetypes[type]) {
                queryMimetypes = queryMimetypes.concat(mimetypes[type]);
            }
        }
        return queryMimetypes;
    }

    function oerMaterialQuery(params) {
        // extract parameters
        const {
            material_ids,
            provider_ids,
            languages,
            queryMimetypes,
            limit,
            offset
        } = params;

        const conditionsFlag = !isNull(material_ids) || !isNull(provider_ids) || !isNull(languages) || !isNull(queryMimetypes);
        const afterMaterialAND = !isNull(material_ids) && (!isNull(provider_ids) || !isNull(languages) || !isNull(queryMimetypes)) ? "AND" : "";
        const afterProviderAND = !isNull(provider_ids) && (!isNull(languages) || !isNull(queryMimetypes)) ? "AND" : "";
        const afterLanguagesAND = !isNull(languages) && !isNull(queryMimetypes) ? "AND" : "";
        let count = 1;

        const query = `
            WITH URLS AS (
                SELECT
                    COALESCE(m.material_id, c.material_id) AS material_id,
                    COALESCE(m.provider_id, c.provider_id) AS provider_id,
                    m.url AS material_url,
                    c.url AS website_url
                FROM contains
                LEFT JOIN urls m ON contains.contains_id = m.id
                LEFT JOIN urls c ON contains.container_id = c.id
                ORDER BY material_id
            ),

            OERS AS (
                SELECT
                    URLS.material_id,
                    oer.title,
                    oer.description,
                    oer.creation_date,
                    oer.retrieved_date,
                    oer.type,
                    oer.mimetype,
                    URLS.material_url,
                    URLS.website_url,
                    oer.language,
                    oer.license,
                    p.name AS provider_name,
                    URLS.provider_id,
                    p.domain AS provider_domain,

                    COUNT(*) OVER() AS total_count
                FROM URLS
                LEFT JOIN oer_materials oer ON URLS.material_id = oer.id
                LEFT JOIN providers     p   ON URLS.provider_id = p.id

                ${conditionsFlag ? "WHERE" : ""}
                ${!isNull(material_ids) ? `URLS.material_id IN (${material_ids.map(() => `$${count++}`).join(",")})` : ""}
                ${afterMaterialAND}
                ${!isNull(provider_ids) ? `URLS.provider_id IN (${provider_ids.map(() => `$${count++}`).join(",")})` : ""}
                ${afterProviderAND}
                ${!isNull(languages) ? `oer.language IN (${languages.map(() => `$${count++}`).join(",")})` : ""}
                ${afterLanguagesAND}
                ${!isNull(queryMimetypes) ? `oer.mimetype IN (${queryMimetypes.map(() => `$${count++}`).join(",")})` : ""}

                ${!isNull(limit) ? `LIMIT ${limit}` : ""}
                ${!isNull(offset) ? `OFFSET ${offset}` : ""}
            ),

            CONTENTS AS (
                SELECT
                    oer_materials.id as material_id,
                    array_agg(c.id) AS content_ids
                FROM oer_materials
                LEFT JOIN material_contents c ON c.material_id = oer_materials.id
                GROUP BY oer_materials.id
            ),

            WIKIPEDIA AS (
                SELECT
                    oer_materials.id as material_id,
                    array_agg(fp.id) as wikipedia_ids
                FROM oer_materials
                LEFT JOIN features_public fp ON fp.record_id = oer_materials.id
                WHERE fp.table_name = 'oer_materials' AND fp.name = 'wikipedia_concepts'
                GROUP BY oer_materials.id
            )

            SELECT
                OERS.*,
                CONTENTS.content_ids,
                WIKIPEDIA.wikipedia_ids
            FROM OERS
            LEFT JOIN CONTENTS ON CONTENTS.material_id = OERS.material_id
            LEFT JOIN WIKIPEDIA ON WIKIPEDIA.material_id = OERS.material_id
            ORDER BY OERS.material_id;
        `;
        return query;
    }

    function materialType(mimetype) {
        for (let type in mimetypes) {
            if (mimetypes[type].includes(mimetype)) {
                return type;
            }
        }
        return null;
    }

    function oerMaterialFormat(pg_material) {
        // get material parameters
        const {
            material_id,
            title,
            description,
            material_url,
            website_url,
            language,
            creation_date,
            retrieved_date,
            type: extension,
            mimetype,
            license,
            wikipedia_ids,

            provider_id,
            provider_name,
            provider_domain,

            content_ids
        } = pg_material;

        // setup material format
        return {
            material_id,
            title,
            description,
            material_url,
            website_url,
            lang_short: language,
            lang_long: iso6391.getName(language),
            creation_date,
            retrieved_date,
            type: materialType(mimetype),
            extension,
            mimetype,
            content_ids,
            provider: {
                provider_id,
                provider_name,
                provider_domain
            },
            license,
            wikipedia_ids
        };
    }

    function createEmbed(material_url, mimetype) {
        return `
            <embed src="${material_url}" type="${mimetype}" width="100%" height="100%" />
        `;
    }

    function createTrack(content_id, lang_long, lang_short, isDefault) {
        return `
            <track
                label="${lang_long}"
                kind="subtitles"
                srclang="${lang_short}"
                src="http://platform.x5gon.org/api/v2/oer_contents/${content_id}/content"
                ${isDefault ? "default" : ""}
            >`;
    }

    function createVideo(material_id, material_url, mimetype, tracks = "") {
        return `
            <video id="material-video-${material_id}" controls preload="metadata" width="100%">
                <source src="${material_url}" type="${mimetype}">
                ${tracks}
            </video>
        `;
    }

    function createHTML(content) {
        return `
            <html>
                <body style="margin: 0px;">
                    ${content}
                </body>
            </html>`;
    }

    /** ********************************
     * Routes
     ******************************** */

    router.get("/api/v2/oer_materials", cors(), [
        query("material_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("provider_ids").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",").map((id) => parseInt(id, 10)) : null)),
        query("languages").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",") : null)),
        query("types").optional().trim()
            .customSanitizer((value) => (value && value.length ? value.toLowerCase().split(",") : null)),
        query("limit").optional().toInt(),
        query("page").optional().toInt()
    ], async (req, res) => {
        /** ********************************
         * setup user parameters
         ******************************** */

        // get user query parameters
        const {
            material_ids,
            provider_ids,
            languages,
            types,
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

        const queryMimetypes = getTypeMimetypes(types);

        // create the query out of the given parameters
        const query = oerMaterialQuery({
            material_ids,
            provider_ids,
            languages,
            ...(queryMimetypes && queryMimetypes.length && { queryMimetypes }),
            limit,
            offset
        });

        // ------------------------------------
        // Create query parameters
        // ------------------------------------

        const parameters = [material_ids, provider_ids, languages, queryMimetypes]
            .filter((object) => !isNull(object))
            .reduce((prev, curr) => prev.concat(curr), []);

        let records;
        try {
            // execute the user query
            records = await pg.execute(query, parameters);
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

        /** ********************************
         * prepare query results
         ******************************** */

        // get full count of the records
        const total_count = parseInt(records[0].total_count, 10);

        // convert the materials
        const output = records.map((material) => oerMaterialFormat(material));

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

        // send the materials to the user
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


    router.get("/api/v2/oer_materials/:material_id", cors(), [
        param("material_id").optional().toInt()
    ], async (req, res) => {
        // get material id
        const {
            material_id
        } = req.params;

        // ------------------------------------
        // Create query
        // ------------------------------------

        // create the query out of the given parameters
        const query = oerMaterialQuery({ material_ids: [material_id] });

        let records;
        try {
            // execute the user query
            records = await pg.execute(query, [material_id]);
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

        /** ********************************
         * prepare query results
         ******************************** */

        // convert the output
        const output = records.map((material) => oerMaterialFormat(material));

        // send the materials to the user
        return res.status(200).send({
            oer_materials: output[0]
        });
    });


    const getContents = bent("GET", `http://127.0.0.1:${config.platform.port}`, "json", 200);
    router.get("/api/v2/oer_materials/:material_id/embed_ready", cors(), [
        param("material_id").optional().toInt()
    ], async (req, res) => {
        // get material id
        const {
            material_id
        } = req.params;

        // ------------------------------------
        // Create query
        // ------------------------------------

        // create the query out of the given parameters
        const query = oerMaterialQuery({ material_ids: [material_id] });

        let records;
        try {
            // execute the user query
            records = await pg.execute(query, [material_id]);
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

        /** ********************************
         * prepare query results
         ******************************** */

        // convert the output
        const output = records.map((material) => oerMaterialFormat(material));

        const {
            material_url,
            lang_short: mlshort,
            type: material_type,
            mimetype
        } = output[0];

        if (material_type === "text") {
            // embed the text
            const text = createEmbed(material_url, mimetype);
            const HTML = createHTML(text);
            // send the materials to the user
            return res.status(200).send(HTML);
        }

        // prepare video container
        let video;
        try {
            const { oer_contents } = await getContents(`/api/v2/oer_contents?material_ids=${material_id}&extensions=webvtt`);
            // generate the tracks out of the oer contents information
            const tracks = oer_contents.map((content) => {
                const {
                    content_id,
                    lang_long: cllong,
                    lang_short: clshort
                } = content;
                return createTrack(content_id, cllong, clshort, clshort === mlshort);
            }).join("\n");
            // embed the video or audio file
            video = createVideo(material_id, material_url, mimetype, tracks);
        } catch (error) {
            // video without the tracks
            video = createVideo(material_id, material_url, mimetype);
        }
        const HTML = createHTML(video);
        // send the materials to the user
        return res.status(200).send(HTML);
    });


    return router;
};
