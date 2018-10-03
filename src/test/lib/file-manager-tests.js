/**************************************************************
 *
 * UNIT TESTS FILE MANAGER
 *
 */

// external modules
const assert = require('assert');
const fs = require('fs');

describe('file-manager.js: file manager methods unit tests.', function () {

    const dirPath = __dirname + '/fileManagerTest';
    after(function (done) {
        require('../../lib/file-manager').removeFolder(dirPath);
        require('../../lib/file-manager').removeFolder(dirPath + '-new');
        done();
    });

    describe('Require module.', function () {

        it ('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow(function () {
                require('../../lib/file-manager');
            });
            done();
        });

        it ('Should have seven methods available', function (done) {
            const fileManager = require('../../lib/file-manager');
            assert.equal(7, Object.keys(fileManager).length);
            done();
        });

    });

    describe('CreateFolder.', function () {

        let createFolder;
        beforeEach(function () {
            createFolder = require('../../lib/file-manager').createFolder;
        });

        afterEach(function (done) {
            require('../../lib/file-manager').removeFolder(dirPath);
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, createFolder);
            done();
        });

        it('Should create a new folder', function (done) {
            createFolder(dirPath);
            assert.equal(true, fs.existsSync(dirPath));
            done();
        });

        it('Should throw error if path to folder does not exists', function (done) {
            const dirPath = __dirname + '/new/path/to/createFolder';
            assert.throws(function () {
                createFolder(dirPath);
            });
            done();
        });

    });

    describe('RemoveFile.',function () {

        let removeFile;
        beforeEach(function () {
            removeFile = require('../../lib/file-manager').removeFile;
        });

        afterEach(function (done) {
            require('../../lib/file-manager').removeFolder(dirPath + '-new');
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, removeFile);
            done();
        });

        it('Should throw an error if file does not exist', function (done) {
            const filePath = __dirname + '/new/path/to/removeFile';
            assert.throws(function () {
                removeFile(filePath);
            });
            done();
        });

        it('Should throw an error if file is actually a directory', function (done) {
            // create the removeFile folder
            require('../../lib/file-manager').createFolder(dirPath);

            assert.throws(function () {
                removeFile(dirPath);
            });
            done();
        });

        it('Should remove file', function (done) {
            // create the removeFile folder
            require('../../lib/file-manager').createFolder(dirPath);
            // create the removeFile file
            const filePath = dirPath + '/removeFile.txt';
            fs.writeFileSync(filePath, 'Remove File');

            if (fs.existsSync(filePath)) {
                removeFile(filePath);
                assert.equal(false, fs.existsSync(filePath));
            } else {
                assert.fail('File removeFile.txt was not created');
            }
            done();
        });

    });

    describe('CopyFolder.', function () {

        let copyFolder;
        beforeEach(function (done) {
            copyFolder = require('../../lib/file-manager').copyFolder;
            // create the copyFolder folder
            require('../../lib/file-manager').createFolder(dirPath);
            done();
        });

        afterEach(function (done) {
            require('../../lib/file-manager').removeFolder(dirPath + '-new');

            if (fs.existsSync(dirPath + '/copyFolder.txt')) {
                require('../../lib/file-manager').removeFile(dirPath + '/copyFolder.txt');
            }

            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, copyFolder);
            done();
        });

        it('Should throw an error if the source is not provided', function (done) {
            assert.throws(function () {
                copyFolder();
            });
            done();
        });
        it('Should throw an error if the source does not exist', function (done) {
            const dirPathNot = dirPath + '.NOT';
            assert.throws(function () {
                copyFolder(dirPathNot);
            });
            done();
        });
        it('Should throw an error if the destination folder does not exist', function (done) {
            assert.throws(function () {
                copyFolder(dirPath);
            });
            done();
        });

        it('Should copy the folder', function (done) {
            // copy the copyFolder into the copyFolder-new
            const destinationPath = dirPath + '-new';
            copyFolder(dirPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });

        it('Should copy the files within the copied folder', function (done) {
            // create the removeFile file
            const filePath = dirPath + '/copyFolder.txt';
            fs.writeFileSync(filePath, 'Copy Folder');

            // copy the copyFolder into the copyFolder-new
            const destinationPath = dirPath + '-new';
            copyFolder(dirPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });

    });

    describe('CreateDirectoryPath', function () {

        let createDirectoryPath;
        beforeEach(function () {
            createDirectoryPath = require('../../lib/file-manager').createDirectoryPath;
        });

        it('Should exist', function (done) {
            assert.notEqual(null, createDirectoryPath);
            done();
        });

        it('Should throw an error if the directory is not provided');
        it('Should create new directories based on its path');

    });

    describe('ExecuteOnFiles', function () {
        let executeOnFiles;
        beforeEach(function () {
            executeOnFiles = require('../../lib/file-manager').executeOnFiles;
            require('../../lib/file-manager').createFolder(dirPath);
        });

        afterEach(function (done) {
            require('../../lib/file-manager').removeFolder(dirPath + '-new');
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, executeOnFiles);
            done();
        });

        it('Should throw an error if starting directory is not provided', function (done) {
            assert.throws(function () {
                executeOnFiles();
            });
            done();
        });
        it('Should throw an error if starting directory does not exist', function (done) {
            const dirPathNot = dirPath + '-new';
            assert.throws(function () {
                executeOnFiles(dirPathNot);
            });
            done();
        });
        it('Should count the number of files in the directory', function (done) {
            let files = ['a', 'ab', 'c', 'd', 'e'];
            for (let file of files) {
                fs.writeFileSync(`${dirPath}/${file}`, file);
            }
            let count = 0;
            executeOnFiles(dirPath, /./, (filename) => {
                count++;
            });

            assert.equal(files.length, count);
            done();
        });

    });

    describe('GetFileContent', function () {

        let getFileContent;
        beforeEach(function () {
            getFileContent = require('../../lib/file-manager').getFileContent;
        });

        it('Should exist', function (done) {
            assert.notEqual(null, getFileContent);
            done();
        });

        it('Should throw an error if the file path is not provided');
        it('Should throw an error if the file does not exist');
        it('Should return the content of the file in raw text');

    });


    describe('RemoveFolder.', function () {

        let removeFolder;
        beforeEach(function () {
            removeFolder = require('../../lib/file-manager').removeFolder;
        });

        it('Should exist', function (done) {
            assert.notEqual(null, removeFolder);
            done();
        });

        it('Should throw an error if the folder path is not provided');
        it('Should throw an error if the folder does not exist');
        it('Should remove all files and folder recursively');
    });


});