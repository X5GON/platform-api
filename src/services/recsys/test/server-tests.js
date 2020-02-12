/**************************************************************
 *
 * SERVER TESTS FOR RECOMMENDER ENGINE
 *
 */

let server = require('../recsys.js');
let agent = require('supertest').agent(server);

describe('server-tests.js: Recommender engine server unit tests.', function () {
    this.slow(300);

    after(function (done) {
        server.close(done);
    });

    it('GET should return bad request (status 400), when the request is empty', function (done) {
        agent
            .get('/api/v1/recommend/materials')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when the text field is empty and url is missing', function (done) {
        agent
            .get('/api/v1/recommend/materials?text=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when the url field is empty and text is missing', function (done) {
        agent
            .get('/api/v1/recommend/materials?url=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return bad request (status 400), when text and url fields are empty', function (done) {
        agent
            .get('/api/v1/recommend/materials?text=&url=')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('GET should return success (status 200), when the text field is non-empty', function (done) {
        agent
            .get('/api/v1/recommend/materials?text=deep learning')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('GET should return success (status 200), when the url field is non-empty', function (done) {
        agent
            .get('/api/v1/recommend/materials?url=http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('GET should return success (status 200), when text and url fields are non-empty', function (done) {
        agent
            .get('/api/v1/recommend/materials?text=deep learning&url=http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf')
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    //POST tests

    it('POST should return bad request (status 400), when the request is empty', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when the text field is empty and url is missing', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ text: '' })
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when the url field is empty and text is missing', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ url: '' })
            .set('Accept', 'application/json')
            .expect(400, done);
    });

    it('POST should return bad request (status 400), when text and url fields are empty', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ text: '', url: '' })
            .set('Accept', 'application/json')
            .expect(400, done);

    });

    it('POST should return success (status 200), when the text field is non-empty', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ text: 'deep learning' })
            .set('Accept', 'application/json')
            .expect(200, done);

    });

    it('POST should return success (status 200), when the url field is non-empty', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ url: 'http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf' })
            .set('Accept', 'application/json')
            .expect(200, done);
    });

    it('POST should return success (status 200), when text and url fields are non-empty', function (done) {
        agent
            .post('/api/v1/recommend/materials')
            .send({ text: 'deep learning', url: 'http://hydro.ijs.si/v00a/f6/63exmtunl4mg5mfifjbcm4lrheoq53mc.pdf' })
            .set('Accept', 'application/json')
            .expect(200, done);
    });

});


