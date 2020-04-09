// import external modules
const request = require("request");
const async = require("async");

// load materials - crawled from eucbeniki.si
const materials = require("../../../data/ecampusontario.json");

console.log(materials.length);

let count = 0;

let quests = [];
for (let material of materials) {
    const {
        title,
        description,
        provider_uri,
        material_url,
        type,
        language,
        license,
        date_created,
        date_retrieved,
        metadata
    } = material;

    // create request object
    const m = {
        title,
        description,
        provider_uri,
        material_url,
        type,
        language,
        license,
        date_created,
        date_retrieved,
        provider_token: "qeq3ks",
    };

    quests.push((callback) => {
        request.post("https://platform.x5gon.org/api/v1/oer_materials", {
            form: {
                api_key: /* '0e1e49b6-e1c5-4ec0-8921-31b97b327e4da5e0', */ "454758b5-3762-4f66-bff0-3cd5cd0197829ee6",
                oer_materials: [m]
            }
        }, (err, httpResponse, body) => {
            if (err) { console.log(err); }
            console.log("Number of requests", ++count);

            if (body) {
                console.log(body);
            }
            callback(null);
        });
    });
}

console.log(quests, quests.length);
async.series(quests, () => {
    console.log("finished processing", count);
});
