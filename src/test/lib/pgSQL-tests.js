/**************************************************************
 *
 * UNIT TESTS postgresQL
 *
 **************************************************************/

// external modules
const assert = require('assert');
const config = require('../../config/config');
const async = require('async');
const pg = require('../../lib/postgresQL')(config.pg);
let createTable = [
    `CREATE TABLE IF NOT EXISTS test_table (id serial PRIMARY KEY, name varchar NOT NULL, domain varchar NOT NULL, contact varchar NOT NULL, token varchar NOT NULL);`,
    'CREATE INDEX IF NOT EXISTS test_table_name_idx ON test_table(name);',
    'CREATE INDEX IF NOT EXISTS test_table_domain_idx ON test_table(domain);',
    'CREATE INDEX IF NOT EXISTS test_table_contact_idx ON test_table(contact);',
    'CREATE INDEX IF NOT EXISTS test_table_token_idx ON test_table(token);'
    ];
let dropTable = [`DROP TABLE test_table;`];
let querystr = '';

describe('postgresQL.js: db methods unit tests.', function () {

    describe('Require module.', function () {

        it ('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow( function () {
                pg;
            });
            done();
        });

        it ('Should be an object--SQL statement', function (done) {
            assert.ok(typeof pg === 'object');
            done();
        });

        it ('Should be able to execute a given statement with no seperate params, Create/intialize the tables', function (done) {
            async.eachSeries(
                createTable,
                (createTable, xcallback) => {
                    pg.execute(
                        createTable, [],
                        (err, res) => {
                             xcallback(err, res);
                        }
                    );
                },
                () => { done(); }
            );
        });
    });

    after(function (done) { // clean/erase db
        async.eachSeries(
            dropTable,
            (dropTable, xcallback) => {
                pg.execute(
                    dropTable, [],
                    (err, res) => {
                         xcallback(err, res);
                    }
                );
            },
            () => { pg.close(); done(); }
        );
    });      

    describe('1.Execute', function () {

        it ('Should give error on invalid query', function (done) {
            querystr = 'add new TABLE test_table;';
            pg.execute( querystr, [] , function (err, res) {
                assert.notEqual(err, null);
                assert.ok(res);
                done();
            });
        });

        it ('Should give no errors with seprate params in statement', function (done) {
            let param = [ 999, 'Firstname', 'domain', '911', 'TOken' ];
            querystr = 'INSERT INTO test_table (id, name, domain, contact, token) VALUES ($1, $2, $3, $4, $5) RETURNING *';
            pg.execute(querystr, param, function (err, res) {
                assert.ok(res);
                assert.equal(err, null);  
                assert.equal(res.length, 1);
                assert.equal(res[0].id, 999);
                assert.equal(res[0].name, 'Firstname');
                assert.equal(res[0].domain, 'domain');
                assert.equal(res[0].contact, '911');
                assert.equal(res[0].token, 'TOken');       
                done();
            });
        });

        it ('Should give error with invalid/missing params', function (done) {
            let param = ['Firstname', 'domain', '911', 'TOken'];
            querystr = 'INSERT INTO test_table (id, name, domain ,contact ,token) VALUES ($1, $2, $3, $4, $5)';
            pg.execute(querystr, param, function (err, res) {
                assert.notEqual(err, null);           
                done();
            });
        });
    });

    describe('2.Insert',function () {

        it ('Should give no errors with correct INSERT statement with Values', function (done) {
            pg.insert({ id: 100, name: 'Firstname', domain: 'domain', contact: '911', token: 'TOken'}, 'test_table', function (err, res) {
                assert.equal(err, null);
                assert.equal(res.length, 1);
                assert.equal(res[0].id, 100);
                assert.equal(res[0].name, 'Firstname');
                assert.equal(res[0].domain, 'domain');
                assert.equal(res[0].contact, '911');
                assert.equal(res[0].token, 'TOken');
                done();
            });
        });

        it ('Should give error on invalid INSERT statement', function (done) {
            pg.insert(( 100, 'Firstname', 'domain', '911', 'TOken'), 'test_table' , function (err, res) {
                assert.notEqual(err, null);
                done();
            });
        });

        it ('Should give error on invalid table in INSERT', function (done) {
            pg.insert({ id: 100, name: 'Firstname', domain: 'domain', contact: '911', token: 'TOken' }, 'missing' , function (err, res) {
                assert.notEqual(err,null);
                done();
            });
        });

        it ('Should give error on empty values', function (done) {
            pg.insert({}, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                done();
            });
        });

        it ('Should give error on invalid values', function (done) {
            pg.insert({ id_name: 100, name: 'Firstname', domain: '', contact: '911', token: 'TOken'}, 'test_table' , function (err, res) {
                assert.notEqual(err,null);
                done();
            });
        });
    });

    describe('3.Select', function () {

        it ('Should give no error with empty conditions in SELECT statement', function (done) {
            pg.select({}, 'test_table', function (err, res) {
                assert.equal(err, null);
                done();
            });
        });

        it ('Should give no error with proper conditions', function (done) {
            pg.select({ id: 100 }, 'test_table', function (err, res) {
                assert.equal(err, null);
                assert.equal(res.length, 1)
                assert.equal(res[0].id, 100);
                done();
            });
        });

        it ('Should give error with invalid conditions', function (done) {
            pg.select({ foo: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error on missing table', function (done) {
            pg.select({ id: 100 }, '', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
       });
    });

    describe.skip('3.3 SelectLarge', function () {
        it ('Should give no error with conditions', function (done) {
            pg.selectLarge({}, 'test_table', 10, (err, res) => {
            // assert.ok(res.length <= 10);                
            },(err, res) => {
            // assert.equal(err,null);
            done();
            });            
        });
    });

    describe('4.Update', function () {

        it ('Should give no error with set conditions & values', function (done) {
            pg.update({ name: 'Fname' }, { id: 100 }, 'test_table', function (err, res) {
                assert.equal(err, null);
                assert.equal(res.length, 1);
                assert.equal(res[0].id, 100);
                assert.equal(res[0].name, 'Fname');
                done();
            });
        });

        it ('Should give error with empty conditions', function (done) {
            pg.update({ name: 'Fname' }, {} , 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with invalid conditions', function (done) {
            pg.update({ name: 'Fname' }, { id_name: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
             });
        });

        it ('Should give error with invalid values', function (done) {
            pg.update({ name_id: 'Fname' }, { id: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
         });

         it ('Should give error with missing values', function (done) {
            pg.update({} ,{ id: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
         });

        it ('Should give error on missing table', function (done) {
            pg.update({ name: 'Fname' },{ id: 100 }, '', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });        
    });

    describe('5.Delete', function () {
        
        it ('Should give error with empty conditions', function (done) {
            pg.delete({}, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give no error with proper conditions', function (done) {
            pg.delete({ id: 100 }, 'test_table', function (err, res) {
                assert.equal(err, null);
                done();
            });
        });

        it ('Should give error with invalid conditions', function (done) {
            pg.delete({ id_name: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error on missing table', function (done) {
            pg.delete({ id: 100 }, '', function (err, res) {
                assert.notEqual(err, null);
                assert.equal(res.length, 0);
                done();
            });
        });
    });

    describe('6.UpSert', function () {

        it ('Should give no error with conditions & values', function (done) {
            pg.upsert({ name: 'Fname', domain: 'domain', contact: '911', token: 'TOken'}, { id: 99 }, 'test_table', function (err, res) {
                assert.equal(err, null);
                done();
            });
        });

        it ('Should update the record if it exists', function (done) {
            pg.upsert({ name:'Firstname', domain: 'domain', contact: '911', token: 'TOken'},{ id: 99 }, 'test_table', function (err, res) {
                assert.equal(err, null);
                done();
            });
        });

        it ('Should give error with no conditions', function (done) {
            pg.upsert({name: 'Fname', domain: 'domain', contact: '911', token: 'TOken'}, {} , 'test_table', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with >1 conditions', function (done) {
            pg.upsert({name: 'Fname', domain: 'domain', contact: '911', token: 'TOken'}, { id_name: 'Fname' }, 'test_table', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with invalid conditions', function (done) {
            pg.upsert({ name: 'Fname', domain: 'domain', contact: '911', token: 'TOken'},{ id_name: 'Fname' }, 'test_table', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with invalid values', function (done) {
            pg.upsert({ name_id: 'Fname', domain: '', contact: '911', token: 'TOken'}, { id: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with missing values', function (done) {
            pg.upsert({} , { id: 100 }, 'test_table', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });

        it ('Should give error with missing table', function (done) {
            pg.upsert({ name: 'Fname', domain: 'domain', contact: '911', token: 'TOken'}, { id: 100 }, '', function (err, res) {
                assert.notEqual(err, null);                
                assert.equal(res.length, 0);
                done();
            });
        });       
    }); 
});