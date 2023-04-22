const multer = require('multer');
const { InvalidFileFormatError } = require('../utils');
const fs = require('fs');
const path = require('path');
const { FileFormats } = require('../constants');

module.exports = function( config={ destinationPath: process.env.APP_BASE_PATH+process.env.TEMP_PATH, keepFileName: true, allowedFiles: [FileFormats.CSV, FileFormats.XLS], uploadToUserFolder: false } ){

    let vDestinationPath = config.destinationPath;
    let vKeepFileName = config.keepFileName;
    let vAllowedFiles = config.allowedFiles;
    let vUploadToUserFolder = config.uploadToUserFolder; 

    let filename = null;

    if(vKeepFileName)
    {
        filename = function (req, file, cb) {
            cb(null, file.originalname);
        }
    }

    let diskStorage = multer.diskStorage({
        destination: function (req, file, cb) {

            if(vUploadToUserFolder){
                let vFolderPath = path.join(vDestinationPath, req.user.loginID);

                fs.mkdir(vFolderPath, function(err){

                    if(err && err.code != 'EEXIST'){
                        return cb(err);
                    }

                    return cb(null, vFolderPath);
                });

                return;
            }

            return cb(null, vDestinationPath);
        },
        filename: filename
    });

    let fileFilter = function(req, file, cb) {

        if(vAllowedFiles.length > 0)
        {
            if( vAllowedFiles.indexOf(file.mimetype) == -1 )
            {
                return cb(new InvalidFileFormatError(`Only ${vAllowedFiles.join(', ')} files are allowed`));
            }

            cb(null, true);
        }
        else
        {
            cb(null, true);
        }
    };

    return multer({
        storage: diskStorage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 50 * 1024 * 1024 //50MB
        }
    });

}