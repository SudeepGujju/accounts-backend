const Joi = require("joi");
const {Schema, model, Error: mongooseError} = require("mongoose");
const { GROUPS_COLLECTION_NAME, USERS_COLLECTION_NAME } = require("../constants");
const { validateRefId } = require('../utils');
const { AccountModel } = require("./account-model");

const GroupType = Object.freeze({Trading: 1, ProfitAndLoss: 2, BalanceSheet: 3 });

const groupSchema = new Schema({
    code: {
        type: String,
        maxlength: 10,
        required: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        maxlength: 50,
        required: true,
    },
    grpType: {
        type: Number,
        enum: [GroupType.Trading, GroupType.ProfitAndLoss, GroupType.BalanceSheet],
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: USERS_COLLECTION_NAME,
        validate: {
			validator: function(v) {
				return validateRefId(model(USERS_COLLECTION_NAME), v);
			},
            message: props => { console.log(props); return `${props.value} is not a valid user id!`}
		}
    }
});

groupSchema.index( {userId: 1, code: 1}, {unique: true});

groupSchema.pre('findOneAndRemove', async function(){

    // const group = await this.findOne().select('code').lean();
    const group = await this.model.findOne( this.getQuery() ).select('code').lean();

    const count = await AccountModel.countDocuments({groupCode: group.code});

    if(count && count > 0)
        throw new mongooseError('Group is linked with other records to delete.');
});

const groupJoiSchema = Joi.object({
    code: Joi.string().max(10).required().uppercase(),
    name: Joi.string().max(50).required(),
    grpType: Joi.number().required().valid(GroupType.Trading, GroupType.ProfitAndLoss, GroupType.BalanceSheet)
});

function validateGroupData(data) {
    return groupJoiSchema.validate(data, { stripUnknown: true });
}

const GroupModel = model(GROUPS_COLLECTION_NAME, groupSchema);


module.exports.validateGroupData = validateGroupData;
module.exports.GroupModel = GroupModel;
module.exports.GroupType = GroupType;