require("module-alias/register");

// external modules
const fs = require("fs");
const path = require("path");

// internal modules
const fileManager = require("@library/file-manager");
const PostgresQL = require("@library/postgresQL");
const qtopology = require("qtopology");

// configuration
const config = require("@config/config");

// parse the command line
const params = qtopology.parseCommandLineEx(process.argv, {
    t: "table",
    f: "filename",
    csvp: "csvPath",
});


// establish a connection with pg
const pg = PostgresQL(config.pg);

let tableRows = "";
let num = 0;


// get the table rows and write them into a file
pg.selectLarge({}, params.table, 10,
    (error, rows, callback) => {
        if (error) { console.log(error); return; }
        // iterate through the rows
        for (let row of rows) {
            if (!tableRows.length) {
                // add header to the string
                const headers = Object.keys(row).map((header) => `"${header}"`).join("|");
                tableRows += `${headers}\n`;
            }
            // get the values of the row
            const values = Object.values(row).map((val) => {
                // show that it is an empty value
                if (!val) { return "\"\""; }

                // handle each value type separately
                if (typeof val === "string") {
                    return `"${val.replace(/"|'/g, "'").replace(/(\n)|(\r\n)/g, " ")}"`;
                } else if (typeof val === "object") {
                    return `${JSON.stringify(val)}`;
                } else {
                    return val;
                }
            }).join("|");
            // append them to the string
            tableRows += `${values}\n`;
            num += 1;
        }
        if (num % 10000 === 0) {
            console.log("Currently processed", num);
        }
        callback();
    }, (error) => {
        pg.close();
        if (error) { console.log(error); return; }

        // create a file to write into the document
        const rootPath = params.csvPath;
        fileManager.createDirectoryPath(rootPath);

        const filePath = path.join(rootPath, params.filename);
        fs.writeFileSync(filePath, tableRows);
    });
