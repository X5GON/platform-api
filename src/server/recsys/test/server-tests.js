'use strict';

/**************************************************************
 *
 * SERVER TESTS FOR RECOMMENDER ENGINE
 *
 */

var assert = require('assert');
var request = require('supertest');
var server = require('../recsys.js'); //TODO: export server as a module
var async = require('async');
var env = process.env.NODE_ENV;

var host_url = 'http://localhost:3000';
var container_url = host_url + '/api/v1/recommend';


describe('/recommend/content', function () {
    it('GET should return bad request (status 400), when the request is empty', function (done) {
        request(container_url)
            .get('/content')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when the text field is empty and url is missing', function (done) {
        request(container_url)
            .get('/content?text=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when the url field is empty and text is missing', function (done) {
        request(container_url)
            .get('/content?url=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when text and url fields are empty', function (done) {
        request(container_url)
            .get('/content?text=&url=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return success (status 200), when the text field is non-empty', function (done) {
        request(container_url)
            .get('/content?text=deep learning')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('GET should return success (status 200), when the url field is non-empty', function (done) {
        request(container_url)
            .get('/content?url=http://videolectures.net/kdd2016_broder_deep_learning/')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('GET should return success (status 200), when text and url fields are non-empty', function (done) {
        request(container_url)
            .get('/content?text=deep learning&url=http://videolectures.net/kdd2016_broder_deep_learning/')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    //POST tests

    it('POST should return bad request (status 400), when the request is empty', function (done) {
        request(container_url)
            .post('/content')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when the text field is empty and url is missing', function (done) {
        request(container_url)
            .post('/content')
            .send({ text: '' })
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when the url field is empty and text is missing', function (done) {
        request(container_url)
            .post('/content')
            .send({ url: '' })
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when text and url fields are empty', function (done) {
        request(container_url)
            .post('/content')
            .send({ text: '', url: '' })
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return success (status 200), when the text field is non-empty', function (done) {
        request(container_url)
            .post('/content')
            .send({ text: 'deep learning' })
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('POST should return success (status 200), when the url field is non-empty', function (done) {
        request(container_url)
            .post('/content')
            .send({ url: 'http://videolectures.net/kdd2016_broder_deep_learning/' })
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('POST should return success (status 200), when text and url fields are non-empty', function (done) {
        request(container_url)
            .post('/content')
            .send({ text: 'deep learning', url: 'http://videolectures.net/kdd2016_broder_deep_learning/' })
            .set('Accept', 'application/json')
            .expect(200, done);
    });

});


