const multer = require("multer");
const fs = require("fs");
const path = require("path");
const multerGridFSStorage = require("multer-gridfs-storage");
const crypto = require("crypto");
const { InvalidFileFormatError } = require("../utils");
const { FileFormats } = require("../constants");

function diskFileUpload(
  config = {
    destinationPath: process.env.APP_BASE_PATH + process.env.TEMP_PATH,
    keepFileName: true,
    allowedFiles: [FileFormats.CSV, FileFormats.XLS],
    uploadToUserFolder: false,
  }
) {

  let filename = null;

  if (config.keepFileName) {
    filename = function (req, file, cb) {
      cb(null, file.originalname);
    };
  }

  let diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (config.uploadToUserFolder) {
        let vFolderPath = path.join(config.destinationPath, req.user.loginID);

        fs.mkdir(vFolderPath, function (err) {
          if (err && err.code != "EEXIST") {
            return cb(err);
          }

          return cb(null, vFolderPath);
        });

        return;
      }

      return cb(null, config.destinationPath);
    },
    filename: filename,
  });

  return multer({
    storage: diskStorage,
    fileFilter: getFileFilter({ allowedFiles: config.allowedFiles }),
    limits: {
      fileSize: 50 * 1024 * 1024, //50MB
    },
  });
};

function dbFileUpload(
  config = {
    destinationBucket: "fs",
    keepFileName: true,
    allowedFiles: [FileFormats.CSV, FileFormats.XLS],
  }
) {
  const { DB_URL } = process.env;

  let diskStorage = multerGridFSStorage({
    url: DB_URL,
    cache: true,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        if (config.keepFileName) {

          const fileInfo = {
            filename: file.originalname,
            bucketName: destinationBucket,
            metadata: {
              originalname: file.originalname,
              userId: req.user.loginID,
              uploadedOn: new Date(),
            },
          };

          return resolve(fileInfo);

        } else {
          crypto.randomBytes(16, (err, buf) => {
            if (err) return reject(err);

            const filename =
              buf.toString("hex") + path.extname(file.originalname);
            const fileInfo = {
              filename,
              bucketName: destinationBucket,
              metadata: {
                originalname: file.originalname,
                userId: req.user.loginID,
                uploadedOn: new Date(),
              },
            };
            return resolve(fileInfo);
          });
        }
      });
    },
  });

  return multer({
    storage: diskStorage,
    fileFilter: getFileFilter({ allowedFiles: config.allowedFiles }),
    limits: {
      fileSize: 50 * 1024 * 1024, //50MB
    },
  });
}

const getFileFilter = (cfg) => {
  return function (req, file, cb) {
    if (cfg.allowedFiles.length > 0) {
      if (cfg.allowedFiles.indexOf(file.mimetype) == -1) {
        return cb(
          new InvalidFileFormatError(
            `Only ${cfg.allowedFiles.join(", ")} files are allowed`
          )
        );
      }

      cb(null, true);
    } else {
      cb(null, true);
    }
  };
};

module.exports = {diskFileUpload, dbFileUpload};