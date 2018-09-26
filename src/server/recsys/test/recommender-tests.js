'use strict';
/**************************************************************
 * 
 * UNIT TESTS FOR RECOMMENDER ENGINE 
 *
 */


let assert = require('assert');
let x5recommend = require('../engine/x5recommend.js');
let path = require('path');

const qm = require('qminer');

// internal modules
const Logger = require('../../../lib/logging-handler')();

// create a logger instance for logging recommendation requests
const logger = Logger.createGroupInstance('recommendation-requests', 'x5recommend');


describe('recommender-tests.js: Recommender engine unit tests.', function(){ // describe L1
  before(function(done){
    done();
  });
  
  let recsys;  
  
  it('Should load the recommender engine', function(done){
    recsys = new x5recommend({mode: 'readOnly',
    path: path.join(__dirname, '../../../../data/recsys')});
    this.timeout(20000);
    assert.ok(recsys);
    done();
  });
  
  it('Should handle an empty query', function(done){
    let expected = {"error": "Missing query"};    
    let recommendations = recsys.recommend();
    assert.deepEqual(expected, recommendations);
    done();
  });
  
  it('Should handle an empty query object', function(done){
    let expected = {"error": "Empty query object"};    
    let recommendations = recsys.recommend({});
    assert.deepEqual(expected, recommendations);
    done();
  });
  
  describe('Text queries.', function(){ // describe L2
    
    it('Should handle an empty text query', function(done){
      let expected = {"error": "Empty query object"};      
      let query = { text: '' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle a text query', function(done){
      let query = { text: 'deep learning' };
      let recommendations = recsys.recommend(query);
      assert.ok(recommendations);
      done();
    });
    
  }); //describe L2

  describe('URL queries.', function(){ // describe L2
    
    it('Should handle an empty url query', function(done){
      let expected = {"error": "Empty query object"}
      let query = { url: '' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle a non-existing url query', function(done){
      let expected = [];
      let query = { url: 'http://videolectures.net/kdd2016_broder_deep/'}
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle an url query', function(done){
      let query = { url: 'http://videolectures.net/kdd2016_broder_deep_learning/'}
      let recommendations = recsys.recommend(query);
      assert.ok(recommendations);
      done();
    });
    
  }); // describe L2
  
  describe('Text and URL queries.', function(){ // describe L2
    
    it('Should handle an empty text and url query', function(done){
      let expected = {"error": "Empty query object"};      
      let query = { text: '', url: '' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle a text and an empty url query as text query', function(done){
      let textQuery = { text: 'deep learning' }
      let expected = recsys.recommend(textQuery);
      let query = { text: 'deep learning', url: '' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle an empty text and a full url query as text query', function(done){
      let urlQuery = { url: 'http://videolectures.net/kdd2016_broder_deep_learning/' }
      let expected = recsys.recommend(urlQuery);
      let query = { text: '', url: 'http://videolectures.net/kdd2016_broder_deep_learning/' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
    it('Should handle a text and url query as url query', function(done){
      let urlQuery = { url: 'http://videolectures.net/kdd2016_broder_deep_learning/' }
      let expected = recsys.recommend(urlQuery);
      let query = { text: 'deep learning', url: 'http://videolectures.net/kdd2016_broder_deep_learning/' };
      let recommendations = recsys.recommend(query);
      assert.deepEqual(expected, recommendations);
      done();
    });
    
  }); // describe L2*/
  
});// end describe L1