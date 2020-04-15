// modules
const express = require("express");
const cors = require("cors");

const router = express.Router();

module.exports = function (pg) {
    /** ********************************
     * Helper functions
     ******************************** */

    /**
     * Gets the API keys from database.
     * @returns {Promise} The promise of the API keys data.
     */
    async function retrieveProviders(provider_ids) {
        return await pg.selectProviderStats(provider_ids);
    }


    /**
     * Fixes and formats the number to show its value in an abbriviated form.
     * @param {Number} number - The number to be formated.
     * @returns {String} The formated number.
     */
    function numberFormat(number) {
        // get the quotient of different values
        const billions = number / 1e9;
        const millions = number / 1e6;
        const thousands = number / 1e3;
        /**
         * Fixes the number based on its value.
         * @param {Number} number - The number to be fixed.
         * @returns {String} The fixed number.
         */
        function toFixed(number) {
            return number <= 10 ? number.toFixed(2)
                : number <= 100 ? number.toFixed(1)
                    : number.toFixed(0);
        }
        // format based on the quotient
        if (Math.floor(billions)) {
            return { number: toFixed(billions), suffix: "B" };
        } else if (Math.floor(millions)) {
            return { number: toFixed(millions), suffix: "M" };
        } else if (Math.floor(thousands)) {
            return { number: toFixed(thousands), suffix: "k" };
        } else {
            return { number, suffix: "" };
        }
    }

    router.get("/api/v2/oer_providers", cors(), async (req, res) => {
        try {
            // get the oer providers
            const providers = await retrieveProviders();

            const oer_providers = providers.map((provider) => ({
                provider_id: provider.id,
                provider_name: provider.name,
                provider_domain: provider.domain,
                statistics: {
                    oer_materials: {
                        count: provider.material_count,
                        text: numberFormat(provider.material_count)
                    },
                    visits: {
                        count: provider.visit_count,
                        text: numberFormat(provider.visit_count)
                    }
                }
            }));

            // get bundle statistics
            const statistics = {
                oer_materials: {
                    count: providers.map((provider) => provider.material_count)
                        .reduce((sum, acc) => sum + acc, 0),
                    get text() {
                        return numberFormat(this.count);
                    }
                },
                user_activities: {
                    count: providers.map((provider) => provider.visit_count)
                        .reduce((sum, acc) => sum + acc, 0),
                    get text() {
                        return numberFormat(this.count);
                    }
                }
            };
            return res.status(200).send({
                oer_providers,
                statistics
            });
        } catch (error) {
            // render the page
            return res.status(500).send({
                errors: {
                    message: "Unable to get oer providers"
                }
            });
        }
    });

    return router;
};
