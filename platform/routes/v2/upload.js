// external modules
const router = require("express").Router();

// internal modules
const KafkaProducer = require("../../library/kafka-producer");

// initialize validator with
const validator = require("../../library/schema-validator")({
    oer_material_schema: require("../../schemas/oer-material-schema")
});

// import mimetypes for comparison
const mimetypes = require("../../config/mimetypes");

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);
    // define topic names
    const TEXT_INDEX = "PREPROC_MATERIAL_TEXT_INDEXING";
    const TEXT_TRANSLATION = "PREPROC_MATERIAL_TEXT_TRANSLATION";
    const VIDEO_TRANSLATION = "PREPROC_MATERIAL_VIDEO_TRANSLATION";


    /** ********************************
     * Helper functions
     ******************************** */

    /**
     * Generates a 40 character long API key.
     * @returns {String} The 40 character long API key.
     */
    function generateUUID() {
        let time = new Date().getTime();
        const uuid = "xxxxxxxx-0xxx-yxxxxxxxxxxxxxxx".replace(/[xy]/g, (char) => {
            let hash = (time + Math.random() * 16) % 16 | 0;
            time = Math.floor(time / 16);
            return (char === "x" ? hash : (hash & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    /**
     * Validates the API key or returns an error stating whats wrong.
     * @param {String} apiKey - The api key to be validated.
     * @param {String} processType - The process type to check.
     */
    async function _checkAPIKeyValidity(apiKey, processType) {
        // first get the api key metadata
        const metadata = await pg.select({ key: apiKey }, "api_keys");
        if (metadata.length === 0) {
            throw new Error("API key not found int the X5GON platform database");
        } else if (!metadata[0].permissions.upload && !metadata[0].permission.upload.includes(processType)) {
            throw new Error(`API key does not have permission to upload, process type = ${processType}`);
        } else {
            return true;
        }
    }


    async function _addMaterialToProcessing(material, processID, processType, kafkaTopic) {
        await pg.insert({ process_id: processID, material_url: material.material_url, process_type: processType }, "material_process_queue");
        logger.info(`[upload] material = ${material.material_url}`);
        material.retrieved_date = (new Date()).toISOString();
        // send the video material
        producer.send(kafkaTopic, material);
    }


    async function _sendMaterialToIndex(material) {
        try {
            let results = await pg.select({ material_url: material.material_url }, "material_process_queue");
            if (results.length) {
                logger.error("[upload] material already in the processing pipeline", { material_url: material.material_url });
                // list the material
                return { error: `Material already in processing pipeline: material_url=${material.material_url}` };
            }
        } catch (error) {
            logger.error("[error] postgresql", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            return { error: "Error on server side" };
        }

        try {
            const process_id = generateUUID();
            // get material mimetype and decide where to send the material metadata
            const mimetype = material.type.mime;
            if (mimetype && mimetypes.text.includes(mimetype)) {
                await _addMaterialToProcessing(material, process_id, "index", TEXT_INDEX);
            } else {
                return { error: "Material type not supported" };
            }
            return { message: `Material uploaded ${material.material_url}` };
        } catch (error) {
            logger.error("[error] postgresql", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            return { error: "Error on server side" };
        }
    }


    async function _sendMaterialToTranslation(material) {
        try {
            let results = await pg.select({ material_url: material.material_url }, "material_process_queue");
            if (results.length) {
                logger.error("[upload] material already in the processing pipeline", { material_url: material.material_url });
                // list the material
                return { error: `Material already in processing pipeline: material_url=${material.material_url}` };
            }
        } catch (error) {
            logger.error("[error] postgresql", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            return { error: "Error on server side" };
        }

        try {
            const process_id = generateUUID();
            // get material mimetype and decide where to send the material metadata
            const mimetype = material.type.mime;
            if (mimetype && mimetypes.video.includes(mimetype)) {
                await _addMaterialToProcessing(material, process_id, "translation", VIDEO_TRANSLATION);
            } else if (mimetype && mimetypes.audio.includes(mimetype)) {
                await _addMaterialToProcessing(material, process_id, "translation", VIDEO_TRANSLATION);
            } else if (mimetype && mimetypes.text.includes(mimetype)) {
                await _addMaterialToProcessing(material, process_id, "translation", TEXT_TRANSLATION);
            } else {
                return { error: "Material type not supported" };
            }
            return { message: `Material uploaded ${material.material_url}` };
        } catch (error) {
            logger.error("[error] postgresql", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            return { error: "Error on server side" };
        }
    }

    /** ********************************
     * Routes
     ******************************** */

    router.post("/api/v2/upload/index", async (req, res) => {
        // get oer_materials
        const {
            api_key: apiKey,
            oer_material
        } = req.body;

        try {
            // check if the API key is valid for this operation
            await _checkAPIKeyValidity(apiKey, "index");
        } catch (error) {
            // provider is not registered in the platform
            logger.warn(`[warn] ${error.mesage}`, logger.formatRequest(req));
            // notify the user about the error
            return res.status(400).send({ error: { msgs: [error.message] } });
        }

        // check for missing parameters
        if (!oer_material) {
            // api key does not have permissions
            logger.warn("[warn] no provided oer_material", logger.formatRequest(req));
            // notify the user about hte
            return res.status(400).send({ error: { msgs: ["missing parameter \"oer_material\""] } });
        }

        // validate the material
        const { isValid } = validator.validateSchema(oer_material, validator.schemas.oer_material_schema);

        if (isValid) {
            // validate if material is in correct format
            const response = await _sendMaterialToIndex(oer_material);
            return response.error
                ? res.status(400).send(response)
                : res.status(200).send(response);
        } else {
            // log the worng parameter
            logger.warn("[warn] parameter \"oer_material\" is of wrong type",
                logger.formatRequest(req, {
                    errors: {
                        msgs: [`parameter "oer_material" is of type ${typeof oer_material}`]
                    }
                }));
            // notify the user about the error
            return res.status(400).send({
                error: {
                    msgs: [`parameter "oer_material" is of type ${typeof oer_material}`]
                }
            });
        }
    });


    router.post("/api/v2/upload/translation", async (req, res) => {
        // get oer_materials
        const {
            api_key: apiKey,
            oer_material
        } = req.body;

        try {
            // check if the API key is valid for this operation
            await _checkAPIKeyValidity(apiKey, "translation");
        } catch (error) {
            // provider is not registered in the platform
            logger.warn(`[warn] ${error.mesage}`, logger.formatRequest(req));
            // notify the user about the error
            return res.status(400).send({ error: { msgs: [error.message] } });
        }

        // check for missing parameters
        if (!oer_material) {
            // api key does not have permissions
            logger.warn("[warn] no provided oer_material", logger.formatRequest(req));
            // notify the user about hte
            return res.status(400).send({ error: { msgs: ["missing parameter \"oer_material\""] } });
        }

        // validate the material
        const { isValid } = validator.validateSchema(oer_material, validator.schemas.oer_material_schema);

        if (isValid) {
            // validate if material is in correct format
            const response = await _sendMaterialToTranslation(oer_material);
            return response.error
                ? res.status(400).send(response)
                : res.status(200).send(response);
        } else {
            // log the worng parameter
            logger.warn("[warn] parameter \"oer_material\" is of wrong type",
                logger.formatRequest(req, {
                    errors: {
                        msgs: [`parameter "oer_material" is of type ${typeof oer_material}`]
                    }
                }));
            // notify the user about the error
            return res.status(400).send({
                error: {
                    msgs: [`parameter "oer_material" is of type ${typeof oer_material}`]
                }
            });
        }
    });


    return router;
};
