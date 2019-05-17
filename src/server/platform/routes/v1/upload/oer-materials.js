// external modules
const router = require('express').Router();

// internal modules
const KafkaProducer = require('alias:lib/kafka-producer');

// initialize validator with
const validator = require('alias:lib/schema-validator')({
    oer_material_schema: require('alias:platform_schemas/oer-material-schema')
});

// import mimetypes for comparison
const mimetypes = require('alias:config/mimetypes');

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);
    // define topic names
    const text_topic  = 'PROCESSING.MATERIAL.TEXT';
    const video_topic = 'PROCESSING.MATERIAL.VIDEO';


    /**********************************
     * Helper functions
     *********************************/

    /**
     * Checks if the provided API key is valid.
     * @param {Object} req - Express request.
     * @param {Object} res - Express response.
     * @param {Function} next - The next function.
     */
    function checkAPIKey(req, res, next) {
        const { api_key } = req.body;

        pg.select({ key: api_key }, 'api_keys', (error, results) => {
            if (error) {
                logger.error('[error] postgresql',
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    })
                );
                return res.status(500).send({
                    errors: { msgs: ['error on validating API key, please try later'] }
                });
            }

            if (results.length === 0) {
                // provider is not registered in the platform
                logger.warn('[warn] postgresql API key not registered in X5GON platform',
                    logger.formatRequest(req)
                );
                // notify the user about hte
                return res.status(400).send({
                    error: {
                        msgs: ['provided API key is valid']
                    }
                });
            } else if (!results[0].permissions.upload.includes('materials')) {
                // api key does not have permissions
                logger.warn('[warn] API key does not have required actions',
                    logger.formatRequest(req, {
                        missing_action: 'upload.materials'
                    })
                );
                // notify the user about hte
                return res.status(400).send({
                    error: {
                        msgs: ['provided API key does not have permission to upload']
                    }
                });
            } else {
                return next();
            }
        });
    }


    /**
     * Validates the material sent by the POST request.
     * @param {Object} material - The material object.
     * @param {Object[]} list - List of objects
     */
    function _sendMaterial(material, list) {
        // validate the material
        const { matching, errors } = validator.validateSchema(
            material,
            validator.schemas.oer_material_schema
        );

        if (!matching) {
            const messages = errors.map(err => err.stack);
            // store the invalid material for the user
            list.push({ material, errors: messages });
        } else {
            for (let key of Object.keys(material)) {
                material[key.replace(/_/g, '')] = material[key];
            }

            if (material.type.mime && mimetypes.video.includes(material.type.mime)) {
                logger.info(`[upload] video material = ${material.materialurl}`);
                // send the video material
                producer.send(video_topic, material);
            } else if (material.type.mime && mimetypes.audio.includes(material.type.mime)) {
                logger.info(`[upload] audio material = ${material.materialurl}`);
                // send the audio material
                producer.send(video_topic, material);
            } else if (material.type.mime && mimetypes.text.includes(material.type.mime)) {
                logger.info(`[upload] text material = ${material.materialurl}`);
                // send the text material
                producer.send(text_topic, material);
            } else {
                // store the invalid material for the user
                const messages = ['Material type not supported'];
                list.push({ material, errors: messages });
            }
        }
    }

    /**********************************
     * Routes
     *********************************/

    router.post('/oer_materials', checkAPIKey, (req, res) => {
        // get oer_materials
        const { oer_materials } = req.body;
        // prepare variables
        let invalid_materials = [];
        let num_submitted = 0;

        // check for missing parameters
        if (!oer_materials) {
            // api key does not have permissions
            logger.warn('[warn] no provided oer_materials',
                logger.formatRequest(req)
            );
            // notify the user about hte
            return res.status(400).send({
                error: {
                    msgs: ['missing parameter "oer_materials"']
                }
            });
        }

        // check if parameter is an array or an object
        if (Array.isArray(oer_materials)) {
            for (let material of oer_materials) {
                // validate if material is in correct format
                _sendMaterial(material, invalid_materials);
            }
            num_submitted = oer_materials.length - invalid_materials.length;
        } else if (typeof oer_materials === 'object') {
            // validate if material is in correct format
            _sendMaterial(oer_materials, invalid_materials);
            num_submitted = 1 - invalid_materials.length;
        } else {
             // log the worng parameter
             logger.warn('[warn] parameter "oer_materials" is of wrong type',
                logger.formatRequest(req, {
                    errors: {
                        msgs: [`parameter "oer_materials" is of type ${typeof oer_materials}`]
                    }
                })
            );
            // notify the user about the error
            return res.status(400).send({
                error: {
                    msgs: [`parameter "oer_materials" is of type ${typeof oer_materials}`]
                }
            });
        }

        /****************************************
         * Submit to the user the status
         */
        let response = {
            num_materials_submitted: num_submitted
        };
        if (invalid_materials.length) {
            response.errors = {
                message: 'materials were not of correct format',
                invalid_count: invalid_materials.length,
                invalid_materials
            };
        } else {
            response.success = {
                message: 'Materials submitted successfully'
            };
        }

        // notify the user about the status
        return res.status(200).send(response);

    });


    return router;
};