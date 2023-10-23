const errorHandler = require('./error');

const {dbFileUpload, diskFileUpload} = require('./file-upload');

module.exports = {
    errorHandler,
    dbFileUpload,
    diskFileUpload
}