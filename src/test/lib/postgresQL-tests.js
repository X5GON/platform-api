/**************************************************************
 *
 * UNIT TESTS PostgresQL
 *
 */

// external modules
const assert = require('assert');
const async = require('async');

// get configuration and create pg connection
const config = require('../../config/config');
const pg = require('../../lib/postgresQL')(config.pg);


describe('postgresQL.js: db methods unit tests.', function () {

    describe('Require module.', function () {

        it('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow( function () { pg; });
            done();
        });

        it('Should be an object', function (done) {
            assert.ok(typeof pg === 'object');
            done();
        });
    });

    // creates the given test table with added indices
    before(function (done) {
        let createTableCommands = [
            `CREATE TABLE IF NOT EXISTS test_table (id serial PRIMARY KEY, name varchar NOT NULL, domain varchar NOT NULL, contact varchar NOT NULL, token varchar NOT NULL);`,
            'CREATE INDEX IF NOT EXISTS test_table_name_idx ON test_table(name);',
            'CREATE INDEX IF NOT EXISTS test_table_domain_idx ON test_table(domain);',
            'CREATE INDEX IF NOT EXISTS test_table_contact_idx ON test_table(contact);',
            'CREATE INDEX IF NOT EXISTS test_table_token_idx ON test_table(token);'
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
    after(function (done) {
        pg.execute('DROP TABLE test_table;', [], (error, results) => {
            pg.close(() => { done(); });
        });
    });


    describe('Execute.', function () {

        it('Should give error on invalid query', function (done) {
            let queryString = 'add new TABLE test_table;';
            pg.execute(queryString, [] , function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should execute command with given parameters', function (done) {
            let params = [ 999, 'Firstname', 'domain', '911', 'TOken' ];
            let queryString = 'INSERT INTO test_table (id, name, domain, contact, token) VALUES ($1, $2, $3, $4, $5) RETURNING *;';
            pg.execute(queryString, params, function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 999);
                assert.equal(response[0].name, 'Firstname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should give error with missing params', function (done) {
            let param = ['Firstname', 'domain', '911', 'TOken'];
            let queryString = 'INSERT INTO test_table (id, name, domain ,contact ,token) VALUES ($1, $2, $3, $4, $5);';
            pg.execute(queryString, param, function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

    });

    describe('Insert.',function () {

        it('Should return the inserted record', function (done) {
            const record = {
                id: 100,
                name: 'Firstname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.insert(record, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, 'Firstname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should throw error if table is not provided', function (done) {
            const record = {
                id: 100,
                name: 'Firstname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.insert(record, 'missing' , function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if record does not have any values', function (done) {
            pg.insert({}, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if record contains invalid values', function (done) {
            const record = {
                id_name: 100,
                name: 'Firstname',
                domain: '',
                contact: '911',
                token: 'TOken'
            };

            pg.insert(record, 'test_table' , function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe('Select.', function () {

        it('Should get all records in the table', function (done) {
            pg.select({}, 'test_table', function (error, response) {
                assert.equal(error, null);
                // records from previous tests
                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it('Should get all records that match the provided condition', function (done) {
            pg.select({ id: 100 }, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, 'Firstname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should throw error if condition is invalid', function (done) {
            pg.select({ foo: 100 }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if no table is provided', function (done) {
            pg.select({ id: 100 }, '', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
       });
    });

    describe('SelectLarge.', function () {

        it('Should get all records', function (done) {
            let count = 0;
            pg.selectLarge({}, 'test_table', 10, (error, response) => {
                assert.equal(error, null);
                assert.ok(response.length <= 10);
                count += response.length;
            },(error) => {
                assert.equal(error, null);
                assert.equal(count, 2);
                done();
            });
        });

    });

    describe('Update.', function () {

        it('Should update records following a given condition', function (done) {
            pg.update({ name: 'Fname' }, { id: 100 }, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 100);
                assert.equal(response[0].name, 'Fname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should update all records if given empty condition object', function (done) {
            pg.update({ name: 'Fname' }, {} , 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it('Should throw error if invalid conditions are provided', function (done) {
            pg.update({ name: 'Fname' }, { id_name: 100 }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
             });
        });

        it('Should throw error if the provided values are invalid', function (done) {
            pg.update({ name_id: 'Fname' }, { id: 100 }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
         });

         it('Should throw error if no values are provided', function (done) {
            pg.update({} ,{ id: 100 }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
         });

        it('Should throw error if no table identifier is provided', function (done) {
            pg.update({ name: 'Fname' },{ id: 100 }, '', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe('Upsert.', function () {

        it('Should insert the record provided', function (done) {
            const record = {
                id: 99,
                name: 'Fname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, { id: {} }, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 99);
                assert.equal(response[0].name, 'Fname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should update the record if it exists', function (done) {
            const record = {
                id: 99,
                name:'Firstname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };
            pg.upsert(record, { id: {} }, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 99);
                assert.equal(response[0].name, 'Firstname');
                assert.equal(response[0].domain, 'domain');
                assert.equal(response[0].contact, '911');
                assert.equal(response[0].token, 'TOken');
                done();
            });
        });

        it('Should throw error if not conditions are provided', function (done) {
            const record = {
                name: 'Fname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, {}, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if there are more than one conditions provided', function (done) {
            const record = {
                name: 'Fname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, { id: {}, name: {} }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if condition is an invalid column name', function (done) {
            const record = {
                name: 'Fname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, { id_name: {} }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if record contains invalid column names', function (done) {
            const record = {
                name_id: 'Fname',
                domain: '',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, { id: {} }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if record does not contain values', function (done) {
            pg.upsert({}, { id: {} }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should throw error if no table is provided', function (done) {
            const record = {
                name: 'Fname',
                domain: 'domain',
                contact: '911',
                token: 'TOken'
            };

            pg.upsert(record, { id: {} }, '', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });

    describe('Delete.', function () {

        it('Should delete the record following the given condition', function (done) {
            pg.delete({ id: 100 }, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 1);
                done();
            });
        });

        it('Should delete all records in the table', function (done) {
            pg.delete({}, 'test_table', function (error, response) {
                assert.equal(error, null);

                assert.ok(response);
                assert.equal(response.length, 2);
                done();
            });
        });

        it('Should give error with invalid conditions', function (done) {
            pg.delete({ id_name: 100 }, 'test_table', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });

        it('Should give error on missing table', function (done) {
            pg.delete({ id: 100 }, '', function (error, response) {
                assert.notEqual(error, null);
                assert.equal(response, null);
                done();
            });
        });
    });
});