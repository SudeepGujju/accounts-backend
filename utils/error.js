const mongoose = require("mongoose");
const multer = require('multer');

class InvalidFileFormatError extends Error{
    constructor(message){
        super(message);
        this.name = this.constructor.name;
    }
}

class InvalidDateFormatError extends Error{
    constructor(message){
        super(message);
        this.name = this.constructor.name;
    }
}

module.exports.parseError = function(ex){

    const error = {code: 500, message: "Internal server error"};

    if(ex instanceof mongoose.Error || ex instanceof mongoose.mongo.MongoServerError)
    {
        error.code = 400;

        if(ex.code == 11000)
            error.message = 'Duplicate entry';
        else if(ex.code == 13)
            error.message = 'DB Authentication failed';
        else
            error.message = ex.message;
    }
    else if(ex instanceof multer.MulterError)
    {
        error.code = 400;
        error.message = ex.message;
    }
    else if(ex instanceof InvalidFileFormatError)
    {
        error.code = 400;
        error.message = ex.message;
    }
    else if(ex instanceof InvalidDateFormatError)
    {
        error.code = 400;
        error.message = ex.message;
    }
    else if(ex instanceof TypeError || ex instanceof ReferenceError || ex instanceof RangeError)
    {
        console.log(ex);
    }
    else
    {
        console.log(ex);
    }

    return error;
}

module.exports.InvalidFileFormatError = InvalidFileFormatError;
module.exports.InvalidDateFormatError = InvalidDateFormatError;