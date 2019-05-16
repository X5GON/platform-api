const assert      = require('assert');
const fileManager = require('alias:lib/file-manager');
const Logger      = require('alias:lib/logger');
const winston     = require('winston');
const path        = require('path');
const fs          = require('fs');

describe('logger.js: logging handler methods unit tests.', function () {

    after(function(){
        fileManager.removeFolder(path.join(__dirname, '../../../logs/Sub-test'));
    });

    describe('Require module.', function () {

        it('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow(Logger);
            done();
        });

        it('Should be a function for creating new logger factories', function (done) {
            assert.ok(typeof Logger === 'function');
            done();
        });

        it('Should create a new logger instance', function (done) {
            const logger = Logger();
            assert.equal(path.join(__dirname, '../../../logs/'), logger.folder);
            done();
        });

    });

    describe('Logger methods.', function () {
        const logger = Logger();

        describe('createInstance.', function () {

            it('Should have createInstance', function (done) {
                assert.ok(logger.createInstance);
                done();
            });

            it('createInstance should be type function', function (done) {
                assert.equal(typeof logger.createInstance, 'function');
                done();
            });

            it('Should return error if no parameters are given', function (done) {
                assert.throws(function () {
                    logger.createInstance();
                });
                done();
            });

            it('Should not throw an error if fileName is present', function (done) {
                assert.doesNotThrow(function () {
                    logger.createInstance('log-file');
                });
                done();
            });

            it('Should return a winston logger object', function (done) {
                const loggerTesting = logger.createInstance('log-file');
                assert.ok(loggerTesting instanceof winston.Logger);
                done();
            });

            it('Should return a winston logger object with default level "info"', function (done) {
                const loggerTesting = logger.createInstance('log-file');
                assert.equal(loggerTesting.transports.console.level, 'info');
                assert.equal(loggerTesting.transports['log-file'].level, 'info');
                done();
            });

            it('Should return a winston logger object with level "info"', function (done) {
                const loggerTesting = logger.createInstance('log-file', 'info');
                assert.equal(loggerTesting.transports.console.level, 'info');
                assert.equal(loggerTesting.transports['log-file'].level, 'info');
                done();
            });

            it('Should return a winston logger object with level "warn"', function (done) {
                const loggerTesting = logger.createInstance('log-file', 'warn');
                assert.equal(loggerTesting.transports.console.level, 'warn');
                assert.equal(loggerTesting.transports['log-file'].level, 'warn');
                done();
            });

            it('Should return a winston logger object with level "error"', function (done) {
                const loggerTesting = logger.createInstance('log-file', 'error');
                assert.equal(loggerTesting.transports.console.level, 'error');
                assert.equal(loggerTesting.transports['log-file'].level, 'error');
                done();
            });

            it('Should return a error for winston logger object with unknown level', function (done) {
                assert.throws(function (xdone) {
                    logger.createInstance('log-file', 'banana');
                    xdone();
                });
                done();
            });

            it('Should create the proper path if given', function (done) {
                const loggerTesting = logger.createInstance('log-file', 'error','Sub-test');
                assert.ok(fs.lstatSync(path.join(__dirname, '../../../logs/Sub-test')).isDirectory());
                done();
            });

            it('Should write to console by default & colorize', function (done) {
                const loggerTesting = logger.createInstance('log-file');
                assert.equal(loggerTesting.transports.console.colorize, true);
                done();
            });

            it('Should not write to console if consoleFlage = false', function (done) {
                const loggerTesting = logger.createInstance('log-file', 'error', '', false);
                assert.throws(function (xdone) {
                    loggerTesting.transports.console;
                    xdone();
                });
                done();
            });
        });

        describe('createGroupInstance.', function () {

            it('Should write to console by default & colorize', function (done) {
                const loggerTesting = logger.createGroupInstance('log-file');
                assert.equal(loggerTesting.transports.console.colorize, true);
                done();
            });

            it('Should not write to console if consoleFlage = false', function (done) {
                const loggerTesting = logger.createGroupInstance('log-file', '', false);
                assert.throws(function (xdone) {
                    loggerTesting.transports.console;
                    xdone();
                });
                done();
            });

            it('Should create the proper path if given', function (done) {
                const loggerTesting = logger.createGroupInstance('log-file', 'Sub-test');
                assert.ok(fs.lstatSync(path.join(__dirname, '../../../logs/Sub-test')).isDirectory());
                done();
            });

            it('Should have createGroupInstance', function (done) {
                assert.ok(logger.createGroupInstance);
                done();
            });

            it('createInstance should be type function', function (done) {
                assert.equal(typeof logger.createGroupInstance, 'function');
                done();
            });

            it('Should not throw an error if fileName is present', function (done) {
                assert.doesNotThrow(function () {
                    logger.createGroupInstance('log-file');
                });
                done();
            });

            it('Should return a winston logger object', function (done) {
                const loggerTesting = logger.createGroupInstance('log-file');
                assert.ok(loggerTesting instanceof winston.Logger);
                done();
            });

            it('Should return a winston logger object with all 3 levels', function (done) {
                const loggerTesting = logger.createGroupInstance('log-file');
                assert.equal(loggerTesting.transports['log-file-info'].level, 'info');
                assert.equal(loggerTesting.transports['log-file-error'].level, 'error');
                assert.equal(loggerTesting.transports['log-file-warn'].level, 'warn');
                done();
            });

            it('Should return error if no parameters are given', function (done) {
                assert.throws(function (xdone) {
                    logger.createGroupInstance();
                    xdone();
                });
                done();
            });
        });

    });

});