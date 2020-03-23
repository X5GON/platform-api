/** ************************************************************
 *
 * UNIT TESTS FILE MANAGER
 *
 */

// external modules
const assert = require("assert");
const fs = require("fs");

describe("file-manager.js: file manager methods unit tests.", () => {
    const dirPath = `${__dirname}/fileManagerTest`;
    after((done) => {
        require("../../lib/file-manager").removeFolder(dirPath);
        done();
    });

    describe("Require module.", () => {
        it("Should not throw an error when requiring the module", (done) => {
            assert.doesNotThrow(() => {
                require("../../lib/file-manager");
            });
            done();
        });

        it("Should have seven methods available", (done) => {
            const fileManager = require("../../lib/file-manager");
            assert.equal(8, Object.keys(fileManager).length);
            done();
        });
    });

    describe("CreateFolder.", () => {
        let createFolder;

        beforeEach(() => {
            createFolder = require("../../lib/file-manager").createFolder;
        });

        it("Should exist", (done) => {
            assert.notEqual(null, createFolder);
            done();
        });

        it("Should create a new folder", (done) => {
            createFolder(dirPath);
            assert.equal(true, fs.existsSync(dirPath));
            done();
        });

        it("Should throw error if path to folder does not exists", (done) => {
            const dirPath = `${__dirname}/new/path/to/createFolder`;
            assert.throws(() => {
                createFolder(dirPath);
            });
            done();
        });
    });

    describe("RemoveFile.", () => {
        let removeFile;
        const folderPath = `${dirPath}/removeFile`;
        beforeEach(() => {
            removeFile = require("../../lib/file-manager").removeFile;
        });

        it("Should exist", (done) => {
            assert.notEqual(null, removeFile);
            done();
        });

        it("Should throw an error if file does not exist", (done) => {
            const filePath = `${__dirname}/new/path/to/removeFile`;
            assert.throws(() => {
                removeFile(filePath);
            });
            done();
        });

        it("Should throw an error if file is actually a directory", (done) => {
            // create the removeFile folder
            require("../../lib/file-manager").createFolder(folderPath);

            assert.throws(() => {
                removeFile(folderPath);
            });
            done();
        });

        it("Should remove file", (done) => {
            // create the removeFile folder
            require("../../lib/file-manager").createFolder(folderPath);
            // create the removeFile file
            const filePath = `${folderPath}/removeFile`;
            fs.writeFileSync(filePath, "Remove File");

            if (fs.existsSync(filePath)) {
                removeFile(filePath);
                assert.equal(false, fs.existsSync(filePath));
            } else {
                assert.fail("File removeFile was not created");
            }
            done();
        });
    });

    describe("CopyFolder.", () => {
        let copyFolder;
        const folderPath = `${dirPath}/copyFolder`;
        beforeEach((done) => {
            copyFolder = require("../../lib/file-manager").copyFolder;
            // create the copyFolder folder
            require("../../lib/file-manager").createFolder(folderPath);
            done();
        });

        it("Should exist", (done) => {
            assert.notEqual(null, copyFolder);
            done();
        });

        it("Should throw an error if the source is not provided", (done) => {
            assert.throws(() => {
                copyFolder();
            });
            done();
        });

        it("Should throw an error if the source does not exist", (done) => {
            const dirPathNot = `${folderPath}.NOT`;
            assert.throws(() => {
                copyFolder(dirPathNot);
            });
            done();
        });

        it("Should throw an error if the destination folder does not exist", (done) => {
            assert.throws(() => {
                copyFolder(folderPath);
            });
            done();
        });

        it("Should copy the folder", (done) => {
            // copy the copyFolder into the copyFolder.new
            const destinationPath = `${folderPath}.new`;
            copyFolder(folderPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });

        it("Should copy the files within the copied folder", (done) => {
            // create the removeFile file
            const filePath = `${folderPath}/copyFolder`;
            fs.writeFileSync(filePath, "Copy Folder");

            // copy the copyFolder into the copyFolder.new
            const destinationPath = `${folderPath}.new`;
            copyFolder(folderPath, destinationPath);

            assert.equal(true, fs.existsSync(destinationPath));
            done();
        });
    });

    describe("CreateDirectoryPath", () => {
        let createDirectoryPath;
        const folderPath = `${dirPath}/createDirectoryPath`;
        beforeEach((done) => {
            createDirectoryPath = require("../../lib/file-manager").createDirectoryPath;
            done();
        });

        it("Should exist", (done) => {
            assert.notEqual(null, createDirectoryPath);
            done();
        });

        it("Should throw an error if the directory is not provided", (done) => {
            assert.throws(() => {
                createDirectoryPath();
            });
            done();
        });

        it("Should create new directories based on its path", (done) => {
            const extendedPath = `${folderPath}/new/path/to/dir`;
            createDirectoryPath(extendedPath);
            assert.equal(true, fs.existsSync(folderPath));
            assert.equal(true, fs.existsSync(`${folderPath}/new`));
            assert.equal(true, fs.existsSync(`${folderPath}/new/path`));
            assert.equal(true, fs.existsSync(`${folderPath}/new/path/to`));
            assert.equal(true, fs.existsSync(`${folderPath}/new/path/to/dir`));
            done();
        });
    });

    describe("ExecuteOnFiles", () => {
        let executeOnFiles;
        const folderPath = `${dirPath}/executeOnFiles`;
        beforeEach((done) => {
            executeOnFiles = require("../../lib/file-manager").executeOnFiles;
            require("../../lib/file-manager").createFolder(folderPath);
            done();
        });

        it("Should exist", (done) => {
            assert.notEqual(null, executeOnFiles);
            done();
        });

        it("Should throw an error if starting directory is not provided", (done) => {
            assert.throws(() => {
                executeOnFiles();
            });
            done();
        });

        it("Should throw an error if starting directory does not exist", (done) => {
            const dirPathNot = `${folderPath}.new`;
            assert.throws(() => {
                executeOnFiles(dirPathNot);
            });
            done();
        });

        it("Should count the number of files in the directory", (done) => {
            // create the files
            let files = ["a", "ab", "c", "d", "e"];
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

    describe("GetFileContent", () => {
        let getFileContent;
        const filePath = `${dirPath}/getFileContent`;
        beforeEach((done) => {
            getFileContent = require("../../lib/file-manager").getFileContent;
            done();
        });

        it("Should exist", (done) => {
            assert.notEqual(null, getFileContent);
            done();
        });

        it("Should throw an error if the file path is not provided", (done) => {
            assert.throws(() => {
                getFileContent();
            });
            done();
        });

        it("Should throw an error if the file does not exist", (done) => {
            assert.throws(() => {
                getFileContent(filePath);
            });
            done();
        });

        it("Should return the content of the file in raw text", (done) => {
            // prepare the file for the test
            fs.writeFileSync(filePath, "getFileContent");
            let fileContent = getFileContent(filePath);
            assert.equal(fileContent, "getFileContent");
            done();
        });
    });


    describe("RemoveFolder.", () => {
        let removeFolder;
        const folderPath = `${dirPath}/removeFolder`;
        beforeEach((done) => {
            removeFolder = require("../../lib/file-manager").removeFolder;
            done();
        });

        it("Should exist", (done) => {
            assert.notEqual(null, removeFolder);
            done();
        });

        it("Should throw an error if the folder path is not provided", (done) => {
            assert.throws(() => {
                removeFolder();
            });
            done();
        });

        it("Should throw an error if the folder does not exist", (done) => {
            assert.throws(() => {
                removeFolder(folderPath);
            });
            done();
        });

        it("Should remove all files and folder recursively", (done) => {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }
            const filePath = `${folderPath}/content`;
            fs.writeFileSync(filePath, "content");
            // remove folder
            removeFolder(folderPath);
            assert.equal(false, fs.existsSync(folderPath));
            done();
        });
    });
});
