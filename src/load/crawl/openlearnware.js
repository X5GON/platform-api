// import external modules
const request = require("request");
const async = require("async");

// load materials - crawled from eucbeniki.si
const materials = require("../../../../../../datasets/x5gon/oer/openlearnware/openlearnware");

console.log(materials.length);

let count = 0;
let skipped = 0;

let quests = [];
for (let material of materials) {
    if (!Object.keys(material).length) {
        console.log("Empty, Number of skipped", ++skipped);
        continue;
    }

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

    if (!material_url.includes(".pdf") && !material_url.includes(".mp3") && !material_url.includes(".mp4")) {
        console.log("Number of skipped", ++skipped);
        continue;
    }

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
        provider_token: "txj464",
        material_metadata: {
            metadata: {
                ...metadata.areas && { areas: metadata.areas },
                ...metadata.collections && { collections: metadata.collections }
            }
        }
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
