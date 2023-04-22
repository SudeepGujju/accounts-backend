const Joi = require("joi");
const {Schema, model } = require("mongoose");
const { ACTIVE_USERS_COLLECTION_NAME } = require('../constants');

const activeUserSchema = new Schema({
    accessToken: {
        type: String,
        required: true,
        unique: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: new Schema({
            loginID: String,
            username: String,
            finYearStart: Date,
            finYearEnd: Date,
            _id: Schema.Types.ObjectId,
            userType: Number
        }),
        required: true
    },
    lastAccessed:{
        type: Date
    }
});

const loginJoiSchema = Joi.object({
    loginID: Joi.string().required(),
    password: Joi.string().required()
});

function validateLoginData(data) {
    return loginJoiSchema.validate(data, { stripUnknown: true });
}

const ActiveUserModel = model(ACTIVE_USERS_COLLECTION_NAME, activeUserSchema);

module.exports.validateLoginData = validateLoginData;
module.exports.ActiveUserModel = ActiveUserModel;
