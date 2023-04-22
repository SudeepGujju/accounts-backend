const Joi = require("joi");
const {Schema, model, Error: mongooseError, Query} = require("mongoose");
const { ACCOUNTS_COLLECTION_NAME, USERS_COLLECTION_NAME, BANK_TRANSACTIONS_COLLECTION_NAME } = require("../constants");
const { validateRefId, validateRefFld } = require('../utils');

const bankTransactionSchema = new Schema({
    trnxDate: {
        type: Date,
        required: true
    },
    fromAcc: {
        type: String,
        required: true,
        validate: {
			validator: function(v) {
                
                var vUserId;

                if(this instanceof Query)
                {
                    vUserId = this.getQuery().userId;
                }
                else
                {
                    vUserId = this.userId;
                }

				return validateRefFld(vUserId, model(ACCOUNTS_COLLECTION_NAME), 'code', v);
			},
            message: props => { console.log(props); return `${props.value} is not a valid account`}
		}
    },
    toAcc: {
        type: String,
        required: true,
        validate: {
			validator: function(v) {
                
                var vUserId;

                if(this instanceof Query)
                {
                    vUserId = this.getQuery().userId;
                }
                else
                {
                    vUserId = this.userId;
                }

				return validateRefFld(vUserId, model(ACCOUNTS_COLLECTION_NAME), 'code', v);
			},
            message: props => { console.log(props); return `${props.value} is not a valid account`}
		}
    },
    desc: {
        type: String,
        maxlength: 50,
        required: true,
        trim: true
    },
    rno:{
        type: String,
        maxlength: 30
    },
    received:{
        type: Number,
        default: 0.00
    },
    paid:{
        type: Number,
        default: 0.00
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        // ref: global.collections.user,
        validate: {
			validator: function(v) {
				return validateRefId(model(USERS_COLLECTION_NAME), v);
			},
            message: props => { console.log(props); return `${props.value} is not a valid user id!`}
		}
    }
});

// bankTransactionSchema.index( {userId: 1, code: 1}, {unique: true});

const bankTransactionJoiSchema = (minDate, maxDate) => {
    return Joi.object({
        trnxDate: Joi.date().min(minDate).max(maxDate).required(),
        fromAcc: Joi.string().max(10).required(),
        toAcc: Joi.string().max(10).required().invalid(Joi.ref('fromAcc')).messages({'any.invalid': 'From account and To account cannot be same'}),
        desc: Joi.string().max(50).required(),
        rno: Joi.string().allow('').max(30),
        received: Joi.number().default(0.00),
        paid: Joi.number().default(0.00),
    }).custom(function(value, helpers){ 

        if(value.received && value.paid){
            throw new Error('Record must not contain both values recieved and paid');
        }
        else if(!value.received && !value.paid){
           throw new Error('Record must have either recieved or paid value');
        }

        return value;
     });

};

function validateBankTransactionData(data, minDate, maxDate) {

    const schema = bankTransactionJoiSchema(minDate, maxDate);

    return schema.validate(data, { stripUnknown: true });
}

const BankTransactionModel = model(BANK_TRANSACTIONS_COLLECTION_NAME, bankTransactionSchema);

module.exports.validateBankTransactionData = validateBankTransactionData;
module.exports.BankTransactionModel = BankTransactionModel;