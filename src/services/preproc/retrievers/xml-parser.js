let parseString = require("xml2js").parseString;
let https = require("https");
const async = require("async");

// configurations
const config = require("@config/config");
// kafka connection
const KafkaProducer = require("@library/kafka-producer");

const producer = new KafkaProducer(config.kafka.host);

let diff = { };
let extensions = { };
function _prepareMaterial(material, file) {
    // get values from the material and file object that are used
    const {
        title,
        description,
        provideruri: originalProviderUri,
        authors,
        language,
        time,
        license
    } = material;

    const {
        src,
        ext,
        mimetype
    } = file;

    const sections = originalProviderUri.split("/");
    const id = sections[sections.length - 1];
    if (!diff[id]) {
        diff[id] = 0;
    }
    diff[id] += 1;

    if (!extensions[ext]) {
        extensions[ext] = 0;
    }
    extensions[ext] += 1;

    let provideruri = originalProviderUri;
    if (originalProviderUri.includes("video4.virtuos.uos.de")) {
        provideruri = `https://video4.virtuos.uos.de/engage/ui/watch.html?id=${id}`;
    }

    // return the material object
    return {
        title,
        description,
        provideruri,
        materialurl: src,
        authors,
        author: authors.join(","),
        language,
        type: { ext, mime: mimetype },
        datecreated: time,
        dateretrieved: (new Date()).toISOString(),
        license
    };
}

function _sendToKafka(material) {
    // check if material is ready for Kafka
    if (!material.provideruri || !material.materialurl || !material.language || !material.type) {
        console.log("Metadata is missing. Unable to push to kafka.", material);
        return;
    }

    let topic = material.type.mime && material.type.mime.includes("video") || material.type.mime.includes("audio")
        ? "PREPROC_MATERIAL_VIDEO" : (material.type.mime && material.type.mime.includes("image")
            ? "STORE_MATERIAL_INCOMPLETE" : "PREPROC_MATERIAL_TEXT");

    let message = {};
    if (topic === "STORE_MATERIAL_INCOMPLETE") {
        delete material.author;
        material.message = "[XML-PARSER] Unsupported material type";
        message = {
            oer_materials_partial: material
        };
    } else {
        delete material.authors;
        message = material;
    }

    // send the material into the processing pipeline
    producer.send(topic, message, (error) => {
        if (error) { console.log(error); }
    });
}

function parseXMLFromUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let bodyChunks = [];
            res.on("data", (chunk) => {
                bodyChunks.push(chunk);
            }).on("end", () => {
                let body = Buffer.concat(bodyChunks);
                parseString(body, (err, result) => {
                    let keys = Object.keys(result);
                    // get in level 1
                    if (keys.length === 1) {
                        result = result[keys[0]];
                    }
                    // check if xml scheme is known
                    if (result.hasOwnProperty("$")) {
                        let schema = result.$;
                        if (schema.hasOwnProperty("xmlns")) {
                            if (schema.xmlns === "http://www.sitemaps.org/schemas/sitemap/0.9") {
                                // get loc, last mod, changefreq
                                if (result.hasOwnProperty("url")) {
                                    for (let item of result.url) {
                                        // process each item
                                        if (item.hasOwnProperty("video:video")) {
                                            for (let video of item["video:video"]) {
                                                let material = {
                                                    title: video["video:title"]
                                                        ? video["video:title"][0] : null,
                                                    description: video["video:description"]
                                                        ? video["video:description"][0] : null,
                                                    provideruri: item.loc
                                                        ? item.loc[0] : null,
                                                    authors: video["video:uploader"]
                                                        ? [video["video:uploader"][0]._] : [],
                                                    language: "de",
                                                    time: video["video:publication_date"]
                                                        ? video["video:publication_date"][0] : null,
                                                    license: null
                                                };
                                                let ext = video["video:content_loc"][0].split(".");
                                                ext = ext[ext.length - 1];
                                                let file = {
                                                    src: video["video:content_loc"]
                                                        ? video["video:content_loc"][0] : null,
                                                    ext: ext || null,
                                                    mimetype: `video/${ext}`
                                                };
                                                let prepared = _prepareMaterial(material, file);
                                                // send prepared to kafka
                                                _sendToKafka(prepared);
                                            }
                                        }
                                    }
                                }
                            } else if (schema.xmlns === "http://www.w3.org/2005/Atom") {
                                if (result.hasOwnProperty("entry")) {
                                    for (let item of result.entry) {
                                        let material = {
                                            title: item.title ? item.title[0] : null,
                                            description: null,
                                            provideruri: item.id ? item.id[0] : null,
                                            authors: item["dc:creator"],
                                            language: item["dc:language"]
                                                ? item["dc:language"][0].substring(0, 2) : "de",
                                            time: item.updated ? item.updated[0] : null,
                                            updated: item.updated ? item.updated[0] : null,
                                            license: null
                                        };
                                        if (item.hasOwnProperty("link")) {
                                            for (let link of item.link) {
                                                link = link.$;
                                                if (!link.hasOwnProperty("type")) {
                                                    continue;
                                                }
                                                let ext = link.href.split(".");
                                                ext = ext[ext.length - 1];
                                                let file = {
                                                    src: link.href ? link.href : null,
                                                    ext: ext || null,
                                                    mimetype: link.type ? link.type : null
                                                };
                                                let prepared = _prepareMaterial(material, file);
                                                // send prepared to kafka
                                                _sendToKafka(prepared);
                                            }
                                        }
                                    }
                                }
                            } else {
                                console.log(
                                    "Unknow XML Schema.",
                                    "Please implement a parser for that schema."
                                );
                            }
                        }
                    }
                    resolve(`Finished parsing XML from URL: ${url}`);
                });
            });
        });
    });
} // returns promise

exports.parseXMLFromUrl = parseXMLFromUrl; // make it accessible from outside

let urls = ["https://video4.virtuos.uos.de/feeds/atom/1.0/oer"/* , 'https://mediathek.hhu.de/sitemap' */];

async.eachSeries(urls, (url, callback) => {
    // console.log(urls, url);
    parseXMLFromUrl(url).then((res) => {
        console.log(res);
        if (callback && typeof callback == "function") {
            callback(null);
        }
    });
}, (err) => {
    if (err) {
        console.log("ERROR processing XML: ", err);
    }
    console.log("XMLs processed");
    console.log("Number of different provider uris:", Object.keys(diff).length);
    console.log("Extensions:", extensions);
});
