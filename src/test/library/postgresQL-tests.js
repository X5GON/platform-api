/** ************************************************************
 *
 * UNIT TESTS PostgresQL
 *
 */

// external modules
const assert = require("assert");
const async = require("async");

// get configuration and create pg connection
const config = require("@config/config");
const pg = require("@library/postgresQL")(config.pg);


describe("postgresQL.js: db methods unit tests.", () => {
    describe("Require module.", () => {
        it("Should not throw an error when requiring the module", (done) => {
            assert.doesNotThrow(() => { pg; });
            done();
        });

        it("Should be an object", (done) => {
            assert.ok(typeof pg === "object");
            done();
        });
    });

    // creates the given test table with added indices
    before((done) => {
        let createTableCommands = [
            "CREATE TABLE IF NOT EXISTS test_table (id serial PRIMARY KEY, name varchar NOT NULL, domain varchar NOT NULL, contact varchar NOT NULL, token varchar NOT NULL);",
            "CREATE INDEX IF NOT EXISTS test_table_name_idx ON test_table(name);",
            "CREATE INDEX IF NOT EXISTS test_table_domain_idx ON test_table(domain);",
            "CREATE INDEX IF NOT EXISTS test_table_contact_idx ON test_table(contact);",
            "CREATE INDEX IF NOT EXISTS test_table_token_idx ON test_table(token);"
        ];

        // execute each command
        async.eachSeries(
            createTableCommands,
            (command, xcallback) => {
                pg.execute(command, [], (error, response) => {
                    xcallback(error, response);
                });
            },
            () => { done(); }
        );
    });

    // clears the test dataset table
    after((done) => {
        pg.execute("DROP TABLE test_table;", [], (error, results) => {
            pg.close(() => { done(); });
        });
    });


    describe("Execute.", () => {
        it("Should give error on invalid query", (done) => {
            let queryString = "add new TABLE test_table;";
            pg.execute(queryString, [], (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should execute command with given parameters", (done) => {
            let params = [999, "Firstname", "domain", "911", "TOken"];
            let queryString = "INSERT INTO test_table (id, name, domain, contact, token) VALUES ($1, $2, $3, $4, $5) RETURNING *;";
            pg.execute(queryString, params, (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 999);
                assert.equal(response[0].name, "Firstname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should give error with missing params", (done) => {
            let param = ["Firstname", "domain", "911", "TOken"];
            let queryString = "INSERT INTO test_table (id, name, domain ,contact ,token) VALUES ($1, $2, $3, $4, $5);";
            pg.execute(queryString, param, (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe("Insert.", () => {
        it("Should return the inserted record", (done) => {
            const record = {
                id: 100,
                name: "Firstname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.insert(record, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, "Firstname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should throw error if table is not provided", (done) => {
            const record = {
                id: 100,
                name: "Firstname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.insert(record, "missing", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if record does not have any values", (done) => {
            pg.insert({}, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if record contains invalid values", (done) => {
            const record = {
                id_name: 100,
                name: "Firstname",
                domain: "",
                contact: "911",
                token: "TOken"
            };

            pg.insert(record, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe("Select.", () => {
        it("Should get all records in the table", (done) => {
            pg.select({}, "test_table", (error, response) => {
                assert.equal(error, null);
                // records from previous tests
                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it("Should get all records that match the provided condition", (done) => {
            pg.select({ id: 100 }, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, "Firstname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should throw error if condition is invalid", (done) => {
            pg.select({ foo: 100 }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if no table is provided", (done) => {
            pg.select({ id: 100 }, "", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe("SelectLarge.", () => {
        it("Should get all records", (done) => {
            let count = 0;
            pg.selectLarge({}, "test_table", 10, (error, response, cb) => {
                assert.equal(error, null);
                assert.ok(response.length <= 10);
                count += response.length;
                cb();
            }, (error) => {
                assert.equal(error, null);
                assert.equal(count, 2);
                done();
            });
        });
    });

    describe("Update.", () => {
        it("Should update records following a given condition", (done) => {
            pg.update({ name: "Fname" }, { id: 100 }, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, "Fname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should update all records if given empty condition object", (done) => {
            pg.update({ name: "Fname" }, {}, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it("Should throw error if invalid conditions are provided", (done) => {
            pg.update({ name: "Fname" }, { id_name: 100 }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if the provided values are invalid", (done) => {
            pg.update({ name_id: "Fname" }, { id: 100 }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if no values are provided", (done) => {
            pg.update({}, { id: 100 }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if no table identifier is provided", (done) => {
            pg.update({ name: "Fname" }, { id: 100 }, "", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe("Upsert.", () => {
        it("Should insert the record provided", (done) => {
            const record = {
                id: 99,
                name: "Fname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, { id: {} }, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 99);
                assert.equal(response[0].name, "Fname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should update the record if it exists", (done) => {
            const record = {
                id: 99,
                name: "Firstname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };
            pg.upsert(record, { id: {} }, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 99);
                assert.equal(response[0].name, "Firstname");
                assert.equal(response[0].domain, "domain");
                assert.equal(response[0].contact, "911");
                assert.equal(response[0].token, "TOken");
                done();
            });
        });

        it("Should throw error if not conditions are provided", (done) => {
            const record = {
                name: "Fname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, {}, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if there are more than one conditions provided", (done) => {
            const record = {
                name: "Fname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, { id: {}, name: {} }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if condition is an invalid column name", (done) => {
            const record = {
                name: "Fname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, { id_name: {} }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if record contains invalid column names", (done) => {
            const record = {
                name_id: "Fname",
                domain: "",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, { id: {} }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if record does not contain values", (done) => {
            pg.upsert({}, { id: {} }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should throw error if no table is provided", (done) => {
            const record = {
                name: "Fname",
                domain: "domain",
                contact: "911",
                token: "TOken"
            };

            pg.upsert(record, { id: {} }, "", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe("Delete.", () => {
        it("Should delete the record following the given condition", (done) => {
            pg.delete({ id: 100 }, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                done();
            });
        });

        it("Should delete all records in the table", (done) => {
            pg.delete({}, "test_table", (error, response) => {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it("Should give error with invalid conditions", (done) => {
            pg.delete({ id_name: 100 }, "test_table", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it("Should give error on missing table", (done) => {
            pg.delete({ id: 100 }, "", (error, response) => {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });
});
