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
    // asynchronously connect the producer
    producer.connect();

    // define topic names
    const text_topic = "PREPROC_MATERIAL_TEXT_TRANSLATION";
    const video_topic = "PREPROC_MATERIAL_VIDEO_TRANSLATION";

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
     * Checks if the provided API key is valid.
     * @param {Object} req - Express request.
     * @param {Object} res - Express response.
     * @param {Function} next - The next function.
     */
    async function checkAPIKey(req, res, next) {
        const { api_key } = req.body;

        try {
            const results = await pg.select({ key: api_key }, "api_keys");
            if (results.length === 0) {
                // provider is not registered in the platform
                logger.warn("[warn] postgresql API key not registered in X5GON platform",
                    logger.formatRequest(req));
                // notify the user about hte
                return res.status(400).send({
                    error: {
                        msgs: ["provided API key is not valid"]
                    }
                });
            } else if (!results[0].permissions.upload && !results[0].permissions.upload.includes("materials")) {
                // api key does not have permissions
                logger.warn("[warn] API key does not have required permissions",
                    logger.formatRequest(req, {
                        missing_permission: "upload.materials"
                    }));
                // notify the user about the error
                return res.status(400).send({
                    error: {
                        msgs: ["provided API key does not have permission to upload"]
                    }
                });
            } else {
                return next();
            }
        } catch (error) {
            logger.error("[error] postgresql",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            return res.status(500).send({
                errors: { msgs: ["error on validating API key, please try later"] }
            });
        }
    }


    /**
     * Validates the material sent by the POST request.
     * @param {Object} material - The material object.
     * @param {Object[]} list - List of objects
     */
    async function _sendMaterial(material, list) {
        // validate the material
        const { isValid, errors } = validator.validateSchema(
            material,
            validator.schemas.oer_material_schema
        );

        if (!isValid) {
            const messages = errors.map((err) => err.stack);
            // store the invalid material for the user
            list.push({ material, errors: messages });
            return;
        }

        let results;
        try {
            results = await pg.select({ material_url: material.material_url }, "material_process_queue");
        } catch (error) {
            logger.error("[error] postgresql", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            list.push({ material, errors: ["Error on server side"] });
            return;
        }

        if (results.length) {
            logger.error("[upload] material already in the processing pipeline",
                { material_url: material.material_url });
            // list the material
            list.push({ material, errors: [`material at location = ${material.material_url} already in processing`] });
            return;
        }

        const process_id = generateUUID();

        // get material mimetype and decide where to send the material metadata
        const mimetype = material.type.mime;
        if (mimetype && mimetypes.video.includes(mimetype)) {
            try {
                await pg.insert({ process_id, material_url: material.material_url }, "material_process_queue");
                logger.info(`[upload] video material = ${material.material_url}`);
                material.retrieved_date = (new Date()).toISOString();
                // send the video material
                producer.send(video_topic, material);
            } catch (xerror) {
                logger.error("[error] postgresql", {
                    error: {
                        message: xerror.message,
                        stack: xerror.stack
                    }
                });
                list.push({ material, errors: ["Error on server side"] });
            }
        } else if (mimetype && mimetypes.audio.includes(mimetype)) {
            try {
                await pg.insert({ process_id, material_url: material.material_url }, "material_process_queue");
                logger.info(`[upload] audio material = ${material.material_url}`);
                material.retrieved_date = (new Date()).toISOString();
                // send the audio material
                producer.send(video_topic, material);
            } catch (xerror) {
                logger.error("[error] postgresql", {
                    error: {
                        message: xerror.message,
                        stack: xerror.stack
                    }
                });
                list.push({ material, errors: ["Error on server side"] });
            }
        } else if (mimetype && mimetypes.text.includes(mimetype)) {
            try {
                await pg.insert({ process_id, material_url: material.material_url }, "material_process_queue");
                logger.info(`[upload] text material = ${material.material_url}`);
                material.retrieved_date = (new Date()).toISOString();
                // send the text material
                producer.send(text_topic, material);
            } catch (xerror) {
                logger.error("[error] postgresql", {
                    error: {
                        message: xerror.message,
                        stack: xerror.stack
                    }
                });
                list.push({ material, errors: ["Error on server side"] });
            }
        } else {
            // store the invalid material for the user
            const messages = ["Material type not supported"];
            list.push({ material, errors: messages });
        }
    }

    /** ********************************
     * Routes
     ******************************** */

    router.post("/api/v1/oer_materials", checkAPIKey, async (req, res) => {
        // get oer_materials
        const { oer_materials } = req.body;
        // prepare variables
        let invalid_materials = [];
        let num_submitted = 0;

        // check for missing parameters
        if (!oer_materials) {
            // api key does not have permissions
            logger.warn("[warn] no provided oer_materials",
                logger.formatRequest(req));
            // notify the user about hte
            return res.status(400).send({
                error: {
                    msgs: ["missing parameter \"oer_materials\""]
                }
            });
        }


        // check if parameter is an array or an object
        if (Array.isArray(oer_materials)) {
            const sendingMaterials = [];
            for (let material of oer_materials) {
                // validate if material is in correct format
                sendingMaterials.push(_sendMaterial(material, invalid_materials));
            }
            await Promise.all(sendingMaterials);
            num_submitted = oer_materials.length - invalid_materials.length;
        } else if (typeof oer_materials === "object") {
            // validate if material is in correct format
            await _sendMaterial(oer_materials, invalid_materials);
            num_submitted = 1 - invalid_materials.length;
        } else {
            // log the worng parameter
            logger.warn("[warn] parameter \"oer_materials\" is of wrong type",
                logger.formatRequest(req, {
                    errors: {
                        msgs: [`parameter "oer_materials" is of type ${typeof oer_materials}`]
                    }
                }));
            // notify the user about the error
            return res.status(400).send({
                error: {
                    msgs: [`parameter "oer_materials" is of type ${typeof oer_materials}`]
                }
            });
        }

        /** **************************************
         * Submit to the user the status
         */
        let response = {
            num_materials_submitted: num_submitted
        };
        if (invalid_materials.length) {
            response.errors = {
                message: "materials were not of correct format",
                invalid_count: invalid_materials.length,
                invalid_materials
            };
        } else {
            response.success = {
                message: "Materials submitted successfully"
            };
        }

        // notify the user about the status
        return res.status(200).send(response);
    });


    return router;
};
