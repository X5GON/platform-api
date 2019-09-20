const assert      = require('assert');
const fileManager = require('@library/file-manager');
const winston     = require('winston');
const path        = require('path');
const fs          = require('fs');

describe('logger.js: logging handler methods unit tests.', function () {

    after(function() {
        fileManager.removeFolder(path.join(__dirname, '../../../logs/unit-test-folder'));
    });

    describe('Require module.', function () {

        it('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow(function () { require('@library/logger'); });
            done();
        });

        it('Should be an object for creating new logger objects', function (done) {
            const Logger = require('@library/logger');
            assert.ok(typeof Logger === 'object');
            done();
        });

        it('Should create new log folder', function (done) {
            const Logger = require('@library/logger');
            assert.equal(path.join(__dirname, '../../../logs/'), Logger.folder);
            done();
        });

    });

    describe('Logger methods.', function () {
        // create Logger factory object
        const Logger = require('@library/logger');

        describe('createInstance.', function () {

            it('Should have createInstance', function (done) {
                assert.ok(Logger.createInstance);
                done();
            });

            it('createInstance should be type function', function (done) {
                assert.equal(typeof Logger.createInstance, 'function');
                done();
            });

            it('Should return error if no parameters are given', function (done) {
                assert.throws(function () {
                    Logger.createInstance();
                });
                done();
            });

            it('Should not throw an error if the "fileName" parameter is present', function (done) {
                assert.doesNotThrow(function () {
                    Logger.createInstance('unit-test', 'unit-test-folder');
                });
                done();
            });

            it('Should return a winston logger object with default level "info"', function (done) {
                const logger = Logger.createInstance('unit-test');
                assert.equal(logger.transports[0].level, 'info');
                assert.equal(logger.transports[1].level, 'info');
                assert.equal(logger.transports[1].filename, 'unit-test');
                done();
            });

            it('Should return a winston logger object with level "info"', function (done) {
                const logger = Logger.createInstance('unit-test', 'info');
                assert.equal(logger.transports[0].level, 'info');
                assert.equal(logger.transports[1].level, 'info');
                done();
            });

            it('Should return a winston logger object with level "warn"', function (done) {
                const logger = Logger.createInstance('unit-test', 'warn');
                assert.equal(logger.transports[0].level, 'warn');
                assert.equal(logger.transports[1].level, 'warn');
                done();
            });

            it('Should return a winston logger object with level "error"', function (done) {
                const logger = Logger.createInstance('unit-test', 'error');
                assert.equal(logger.transports[0].level, 'error');
                assert.equal(logger.transports[1].level, 'error');
                done();
            });

            it('Should return a error for winston logger object with unknown level', function (done) {
                assert.throws(function (xdone) {
                    Logger.createInstance('unit-test', 'banana');
                    xdone();
                });
                done();
            });

            it('Should create the proper path if given', function (done) {
                Logger.createInstance('unit-test', 'error', 'unit-test-folder');
                assert.ok(fs.lstatSync(path.join(__dirname, '../../../logs/unit-test-folder')).isDirectory());
                done();
            });

            it('Should not write to console if consoleFlag = false', function (done) {
                const logger = Logger.createInstance('unit-test', 'error', 'unit-test-folder', false);
                for (let transport of logger.transports) {
                    assert.ok(!(transport instanceof winston.transports.Console));
                }
                done();
            });
        });

        describe('createGroupInstance.', function () {

            it('Should have createGroupInstance', function (done) {
                assert.ok(Logger.createGroupInstance);
                done();
            });

            it('createInstance should be type function', function (done) {
                assert.equal(typeof Logger.createGroupInstance, 'function');
                done();
            });

            it('Should return error if no parameters are given', function (done) {
                assert.throws(function (xdone) {
                    Logger.createGroupInstance();
                    xdone();
                });
                done();
            });

            it('Should not throw an error if fileName is present', function (done) {
                assert.doesNotThrow(function () {
                    Logger.createGroupInstance('unit-test', 'unit-test-folder');
                });
                done();
            });


            it('Should not write to console if consoleFlag = false', function (done) {
                const logger = Logger.createGroupInstance('unit-test', 'unit-test-folder', false);
                for (let transport of logger.transports) {
                    assert.ok(!(transport instanceof winston.transports.Console));
                }
                done();
            });

            it('Should create the full logger path', function (done) {
                Logger.createGroupInstance('unit-test', 'unit-test-folder');
                assert.ok(fs.lstatSync(path.join(__dirname, '../../../logs/unit-test-folder')).isDirectory());
                done();
            });

            it('Should return a winston logger object with all 3 levels', function (done) {
                const logger = Logger.createGroupInstance('unit-test', 'unit-test-folder');
                assert.equal(logger.transports[1].level, 'info');
                assert.equal(logger.transports[2].level, 'warn');
                assert.equal(logger.transports[3].level, 'error');
                done();
            });

        });

    });

});