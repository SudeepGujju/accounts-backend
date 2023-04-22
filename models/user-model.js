const Joi = require("joi");
const {Schema, model} = require("mongoose");
const { USERS_COLLECTION_NAME } = require('../constants');

const UserStatus = Object.freeze({ Active: 1, Inactive: 2, Deleted: 3 });
const UserType = Object.freeze({ Admin: 1, User: 2 });

const userSchema = new Schema({
    username:{
        type: String,
        minlength: 3,
        maxlength: 30,
        required: true,
        uppercase: true
    },
    loginID: {
        type: String,
        minlength: 3,
        maxlength: 15,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 7,
        maxlength: 1024,
        required: true
    },
    phone: {
        type: String,
        // minlength: 10,
        maxlength: 10,
        validate: {
            validator: function(val){
                return val.length >= 10 || val.length === 0
            },
            message: () => 'phone cannot be less than 10 numbers'
        }
    },
    finYear:{
        type: String,
        required: true
    },
    status: {
        type: Number,
        enum: [UserStatus.Active, UserStatus.Inactive, UserStatus.Deleted],
        required: true
    },
    userType: {
        type: Number,
        enum: [UserType.Admin, UserType.User],
        required: true,
        default: UserType.User
    },
    dataClean:{
        type: Object,
        default: {
            bankTransaction: false,
            transaction: false,
            invoice: false,
            account: false,
            group: false
        },
        required: true
    }
});

const userJoiSchema = Joi.object({
    username: Joi.string().min(1).max(30).required(),
    loginID: Joi.string().min(3).max(15).required(),
    phone: Joi.string().allow('').min(10).max(10),
    password: Joi.string().min(7).max(15).required(),
    finYear: Joi.string().required(),
    status: Joi.number().required().valid(UserStatus.Active, UserStatus.Inactive, UserStatus.Deleted)
});

function validateUserData(data) {
    return userJoiSchema.validate(data, { stripUnknown: true });
}

const UserModel = model(USERS_COLLECTION_NAME, userSchema);

module.exports.validateUserData = validateUserData;
module.exports.UserModel = UserModel;
module.exports.UserStatus = UserStatus;
module.exports.UserType = UserType;