/**************************************************************
 *
 * UNIT TESTS postgresQL
 *
 **************************************************************/

// external modules
const assert = require('assert');
const config = require('../../config/config');
const async = require('async');
pg=require('../../lib/postgresQL')(config.pg);
var createTable=[
    `CREATE TABLE IF NOT EXISTS repositories (id serial PRIMARY KEY, name varchar NOT NULL,
        domain varchar NOT NULL, contact varchar NOT NULL, token varchar NOT NULL);`,
    'CREATE INDEX IF NOT EXISTS repositories_name_idx ON repositories(name);',
    'CREATE INDEX IF NOT EXISTS repositories_domain_idx ON repositories(domain);',
    'CREATE INDEX IF NOT EXISTS repositories_contact_idx ON repositories(contact);',
    'CREATE INDEX IF NOT EXISTS repositories_token_idx ON repositories(token);'];
var dropTable=[`DROP TABLE repositories;`];
var querystr='';

describe('postgresQL.js: db methods unit tests.', function () {

    describe('Require module.', function () {

        it ('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow(function () {
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
                        (err,res) => {
                             xcallback(err, res);
                        }
                    );
                },
                () => { 
                 done();
                 }
            );
        });


    });

    before(function (done) { // create/intialize db
        
        done();
    });

    after(function (done) { // clean/erase db
        async.eachSeries(
            dropTable,
            (dropTable, xcallback) => {
                pg.execute(
                    dropTable, [],
                    (err,res) => {
                         xcallback(err, res);
                    }
                );
            },
            () => { pg.close(); done();}
        );

    });      

    describe('1.Execute', function () {

        it ('Should give error on invalid query', function (done) {
            querystr='add new TABLE repositories;';

            pg.execute(querystr, [], function (err,res){
                assert.notEqual(err,null);
                assert.ok(res);
                done();
            })


        });

        it ('Should give no errors with seprate params in statement', function (done) {
            var param=[999, 'Firstname','domain','911','TOken'];
            querystr="INSERT INTO repositories (id,name,domain,contact,token) VALUES ($1,$2,$3,$4,$5) RETURNING *";
            pg.execute(querystr, param, function (err,res){
                assert.ok(res);
                assert.equal(err,null);  
                assert.equal(res.length, 1);
                assert.equal(res[0].id, 999);
                assert.equal(res[0].name, 'Firstname');
                assert.equal(res[0].domain, 'domain');
                assert.equal(res[0].contact, '911');
                assert.equal(res[0].token, 'TOken');       
                done();
            })
        });

        it ('Should give error with invalid params', function (done) {
            var param=['Firstname','domain','911','TOken'];
            querystr="INSERT INTO repositories (id,name,domain,contact,token) VALUES ($1,$2,$3,$4,$5)";
            pg.execute(querystr, param, function (err,res){
                assert.notEqual(err,null);           
                done();
            })
        });

           

    });


    describe('2.Insert.',function () {

        it ('Should give no errors with correct statement', function (done) {
           //INSERT INTO repositories VALUES (99, 'Firstname','domain','911','TOken')
    
               pg.insert({id:100, name:'Firstname',domain:'domain', contact:'911', token:'TOken'}, 'repositories', function (err,res){
                    assert.equal(err,null);
                    assert.equal(res.length, 1);
                    assert.equal(res[0].id, 100);
                    assert.equal(res[0].name, 'Firstname');
                    assert.equal(res[0].domain, 'domain');
                    assert.equal(res[0].contact, '911');
                    assert.equal(res[0].token, 'TOken');                    
                   // console.log(res);
                    done();
                })
        });

        it ('Should give error on invalid insert', function (done) {
            //INSERT IN repositories VALS (99, 'Firstname','domain','911','TOken')
                pg.insert((100,'Firstname','domain','911','TOken'), 'repositories', function (err,res){
                     assert.notEqual(err,null);
                     done();
                 })
         });

         it ('Should give error on missing table insert', function (done) {
           //INSERT INTO '' VALUES (99, 'Firstname','domain','911','TOken')
           pg.insert({id:100, name:'Firstname',domain:'domain', contact:'911', token:'TOken'}, 'missing', function (err,res){
                assert.notEqual(err,null);
                     done();
                 })
         });

         it ('Should give error on missing values', function (done) {
            //INSERT INTO '' VALUES ()
            pg.insert({}, 'repositories', function (err,res){
                 assert.notEqual(err,null);
                      done();
                  })
          });

          it ('Should give error on invalid values', function (done) {
            //INSERT INTO '' VALUES (99, 'Firstname','domain','911','TOken')
            pg.insert({id_name:100, name:'Firstname',domain:'', contact:'911', token:'TOken'}, 'repositories', function (err,res){
                 assert.notEqual(err,null);
                      done();
                  })
          });

       


    });

    describe('3.Select', function () {

        it ('Should give no error with empty conditions', function (done) {
            //SELECT * FROM repositories
            pg.select({}, 'repositories', function (err,res){
                assert.equal(err,null);
                     done();
                 })
        });

        it ('Should give no error with conditions', function (done) {
            //SELECT * FROM repositories WHERE conditions....
            pg.select({id:100}, 'repositories', function (err,res){
                assert.equal(err,null);
                assert.equal(res.length,1)
                assert.equal(res[0].id,100);
                     done();
                 })
        });


        it ('Should give error with invalid conditions', function (done) {
             //SELECT * FROM repositories WHERE Xconditions....
             pg.select({foo:100}, 'repositories', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0)
                     done();
                 })
        });


        it ('Should give error on missing table', function (done) {
            //SELECT * FROM repositories WHERE Xconditions....
            pg.select({id:100}, '', function (err,res){
               assert.notEqual(err,null);
               assert.equal(res.length,0)
                    done();
                })
       });


    });

    describe.skip('3.3 SelectLarge', function () {
        it ('Should give no error with conditions', function (done) {
        
    ///..........  in callback check the batch size n tot.

            pg.selectLarge({ },'repositories', 10, (err,res) => {
                // assert.equal(err,null);
                // assert.ok(res.length <= 10);
                console.log(res+"2");
                
            },(err,res) => {
                // assert.equal(err,null);
                done();
            });
            
        });

    });

    describe('4.Update', function () {

        it ('Should give no error with conditions & values', function (done) {
            //UPDATE repositories SET values WHERE conditions
            pg.update({name:'Fname'},{id:100},'repositories', function (err,res){
                assert.equal(err,null);
                assert.equal(res.length,1);
                assert.equal(res[0].id,100);
                assert.equal(res[0].name,'Fname');
                     done();
                 })
        });

        it ('Should give error with no conditions', function (done) {
            //UPDATE repositories SET values WHERE conditions
            pg.update({name:'Fname'},{},'repositories', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0);
                     done();
                 })
        });


        it ('Should give error with invalid conditions', function (done) {
           //UPDATE repositories SET values WHERE Xconditions
           pg.update({name:'Fname'},{id_name:100},'repositories', function (err,res){
            assert.notEqual(err,null);
            assert.equal(res.length,0);
                 done();
             })
        });

        it ('Should give error with invalid values', function (done) {
            //UPDATE repositories SET values WHERE Xconditions
            pg.update({name_id:'Fname'},{id:100},'repositories', function (err,res){
             assert.notEqual(err,null);
             assert.equal(res.length,0);
                  done();
              })
         });

         it ('Should give error with missing values', function (done) {
            //UPDATE repositories SET values WHERE Xconditions
            pg.update({},{id:100},'repositories', function (err,res){
             assert.notEqual(err,null);
             assert.equal(res.length,0);
                  done();
              })
         });

        it ('Should give error on missing table', function (done) {
            //UPDATE repositories SET values WHERE conditions
            pg.update({name:'Fname'},{id:100},'', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0);
                     done();
                 })
        });
        
    });

    describe('5.Delete', function () {
        

        it ('Should give error with empty conditions', function (done) {
            //DELETE FROM repositories
            pg.delete({},'repositories', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0);
                     done();
                 })
        });

        it ('Should give no error with conditions', function (done) {
            //DELETE FROM repositories WHERE conditions....
            pg.delete({id:100},'repositories', function (err,res){
                assert.equal(err,null);
                     done();
                 })
        });


        it ('Should give error with invalid conditions', function (done) {
            //DELETE FROM repositories WHERE Xconditions....
            pg.delete({id_name:100},'repositories', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0);
                     done();
                 })
        });

        it ('Should give error on missing table', function (done) {
            //UPDATE repositories SET values WHERE conditions
            pg.delete({id:100},'', function (err,res){
                assert.notEqual(err,null);
                assert.equal(res.length,0);
                     done();
                 })
        });

    });

    describe('6.UpSert', function () {

        it ('Should give no error with conditions & values', function (done) {
            //INSERT INTO repositories values ON CONFLICT condition DO UPDATE SET values
                pg.upsert({name:'Fname',domain:'domain', contact:'911', token:'TOken'},{id:99},'repositories', function (err,res){
                assert.equal(err,null);
                //assert.equal(res[0].id,99);                    
               // assert.equal(res[0].name,'Fname');
                     done();
                 })
        });

        it ('Should update the second time', function (done) {
            //INSERT INTO repositories values ON CONFLICT condition DO UPDATE SET values
            
                 pg.upsert({name:'Firstname',domain:'domain', contact:'911', token:'TOken'},{id:99},'repositories', function (err,res){
                    assert.equal(err,null);
                    //assert.equal(res[0].id,99);                    
                    //assert.equal(res[0].name,'Firstname');
                         done();
                     })
        });

        it ('Should give error with no conditions', function (done) {
             //INSERT INTO repositories values ON CONFLICT {} DO UPDATE SET values
             pg.upsert({name:'Fname',domain:'domain', contact:'911', token:'TOken'},{},'repositories', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });

        it ('Should give error with >1 conditions', function (done) {
            //INSERT INTO repositories values ON CONFLICT conditions DO UPDATE SET values
            pg.upsert({name:'Fname',domain:'domain', contact:'911', token:'TOken'},{id_name:'Fname'},'repositories', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });


        it ('Should give error with invalid conditions', function (done) {
            //INSERT INTO repositories values ON CONFLICT Xcondition DO UPDATE SET values
            pg.upsert({name:'Fname',domain:'domain', contact:'911', token:'TOken'},{id_name:'Fname'},'repositories', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });

        it ('Should give error with invalid values', function (done) {
            //INSERT INTO repositories values ON CONFLICT Xcondition DO UPDATE SET values
            pg.upsert({name_id:'Fname',domain:'', contact:'911', token:'TOken'},{id:100},'repositories', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });
        it ('Should give error with missing values', function (done) {
            //INSERT INTO repositories values ON CONFLICT Xcondition DO UPDATE SET values
            pg.upsert({},{id:100},'repositories', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });


        it ('Should give error with missing table', function (done) {
            //INSERT INTO repositories values ON CONFLICT Xcondition DO UPDATE SET values
            pg.upsert({name:'Fname',domain:'', contact:'911', token:'TOken'},{id:100},'', function (err,res){
                assert.notEqual(err,null);                
                assert.equal(res.length,0);
                     done();
                 })
        });
       
    });

   


});