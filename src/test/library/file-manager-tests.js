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
        done();
    });

    describe('Require module.', function () {

        it('Should not throw an error when requiring the module', function (done) {
            assert.doesNotThrow(function () {
                require('../../lib/file-manager');
            });
            done();
        });

        it('Should have seven methods available', function (done) {
            const fileManager = require('../../lib/file-manager');
            assert.equal(8, Object.keys(fileManager).length);
            done();
        });

    });

    describe('CreateFolder.', function () {

        let createFolder;

        beforeEach(function () {
            createFolder = require('../../lib/file-manager').createFolder;
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
        const folderPath = dirPath + '/removeFile';
        beforeEach(function () {
            removeFile = require('../../lib/file-manager').removeFile;
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
            require('../../lib/file-manager').createFolder(folderPath);

            assert.throws(function () {
                removeFile(folderPath);
            });
            done();
        });

        it('Should remove file', function (done) {
            // create the removeFile folder
            require('../../lib/file-manager').createFolder(folderPath);
            // create the removeFile file
            const filePath = folderPath + '/removeFile';
            fs.writeFileSync(filePath, 'Remove File');

            if (fs.existsSync(filePath)) {
                removeFile(filePath);
                assert.equal(false, fs.existsSync(filePath));
            } else {
                assert.fail('File removeFile was not created');
            }
            done();
        });

    });

    describe('CopyFolder.', function () {

        let copyFolder;
        const folderPath = dirPath + '/copyFolder';
        beforeEach(function (done) {
            copyFolder = require('../../lib/file-manager').copyFolder;
            // create the copyFolder folder
            require('../../lib/file-manager').createFolder(folderPath);
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
            const dirPathNot = folderPath + '.NOT';
            assert.throws(function () {
                copyFolder(dirPathNot);
            });
            done();
        });

        it('Should throw an error if the destination folder does not exist', function (done) {
            assert.throws(function () {
                copyFolder(folderPath);
            });
            done();
        });

        it('Should copy the folder', function (done) {
            // copy the copyFolder into the copyFolder.new
            const destinationPath = folderPath + '.new';
            copyFolder(folderPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });

        it('Should copy the files within the copied folder', function (done) {
            // create the removeFile file
            const filePath = folderPath + '/copyFolder';
            fs.writeFileSync(filePath, 'Copy Folder');

            // copy the copyFolder into the copyFolder.new
            const destinationPath = folderPath + '.new';
            copyFolder(folderPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });

    });

    describe('CreateDirectoryPath', function () {

        let createDirectoryPath;
        const folderPath = dirPath + '/createDirectoryPath';
        beforeEach(function (done) {
            createDirectoryPath = require('../../lib/file-manager').createDirectoryPath;
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, createDirectoryPath);
            done();
        });

        it('Should throw an error if the directory is not provided', function (done) {
            assert.throws(function () {
                createDirectoryPath();
            });
            done();
        });

        it('Should create new directories based on its path', function (done) {
            const extendedPath = folderPath + '/new/path/to/dir';
            createDirectoryPath(extendedPath);
            assert.equal(true, fs.existsSync(folderPath));
            assert.equal(true, fs.existsSync(folderPath + '/new'));
            assert.equal(true, fs.existsSync(folderPath + '/new/path'));
            assert.equal(true, fs.existsSync(folderPath + '/new/path/to'));
            assert.equal(true, fs.existsSync(folderPath + '/new/path/to/dir'));
            done();
        });

    });

    describe('ExecuteOnFiles', function () {
        let executeOnFiles;
        const folderPath = dirPath + '/executeOnFiles';
        beforeEach(function (done) {
            executeOnFiles = require('../../lib/file-manager').executeOnFiles;
            require('../../lib/file-manager').createFolder(folderPath);
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
            const dirPathNot = folderPath + '.new';
            assert.throws(function () {
                executeOnFiles(dirPathNot);
            });
            done();
        });

        it('Should count the number of files in the directory', function (done) {
            // create the files
            let files = ['a', 'ab', 'c', 'd', 'e'];
            for (let file of files) {
                fs.writeFileSync(`${folderPath}/${file}`, file);
            }
            let count = 0;
            executeOnFiles(folderPath, /./, (filename) => {
                count++;
            });

            assert.equal(files.length, count);
            done();
        });

    });

    describe('GetFileContent', function () {

        let getFileContent;
        const filePath = dirPath + '/getFileContent';
        beforeEach(function (done) {
            getFileContent = require('../../lib/file-manager').getFileContent;
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, getFileContent);
            done();
        });

        it('Should throw an error if the file path is not provided', function (done) {
            assert.throws(function () {
                getFileContent();
            });
            done();
        });

        it('Should throw an error if the file does not exist', function (done) {
            assert.throws(function () {
                getFileContent(filePath);
            });
            done();
        });

        it('Should return the content of the file in raw text', function (done) {
            // prepare the file for the test
            fs.writeFileSync(filePath, 'getFileContent');
            let fileContent = getFileContent(filePath);
            assert.equal(fileContent, 'getFileContent');
            done();
        });

    });


    describe('RemoveFolder.', function () {

        let removeFolder;
        const folderPath = dirPath + '/removeFolder';
        beforeEach(function (done) {
            removeFolder = require('../../lib/file-manager').removeFolder;
            done();
        });

        it('Should exist', function (done) {
            assert.notEqual(null, removeFolder);
            done();
        });

        it('Should throw an error if the folder path is not provided', function (done) {
            assert.throws(function () {
                removeFolder();
            });
            done();
        });

        it('Should throw an error if the folder does not exist', function (done) {
            assert.throws(function () {
                removeFolder(folderPath);
            });
            done();
        });

        it('Should remove all files and folder recursively', function (done) {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }
            const filePath = folderPath + '/content';
            fs.writeFileSync(filePath, 'content');
            // remove folder
            removeFolder(folderPath);
            assert.equal(false, fs.existsSync(folderPath));
            done();
        });
    });


});