const Joi = require("joi");
const {Schema, model, Error: mongooseError} = require("mongoose");
const { USERS_COLLECTION_NAME, INVOICES_COLLECTION_NAME } = require("../constants");
const { validateRefId, formatUIDate } = require('../utils');

const InvoiceType = Object.freeze({Sales: 1, Purchase: 2, CRN_SR: 3, DBN_PR: 4});
const InvoiceMode = Object.freeze({B2B: 'B2B', B2CS: 'B2CS'});

const invoiceSchema = new Schema({
    invcType: {
        type: Number,
        enum: [InvoiceType.Sales, InvoiceType.Purchase, InvoiceType.CRN_SR, InvoiceType.DBN_PR],
        required: true
    },
    invcNo:{
        type: String,
        maxlength: 50,
        required: true
    },
    mode:{
        type: String,
        enum: [InvoiceMode.B2B, InvoiceMode.B2CS],
        required: true
    },
    invcDate: {
        type: Date,
        required: true
    },
    cr:{
        type: String,
    },
    code:{
        type: String,
    },
    name:{
        type: String,
        maxlength: 100
    },
    town:{
        type: String,
        maxlength: 100
    },
    gst:{
        type: String,
        // minlength: 2,
        maxlength: 15,
        // validate: {
        //     validator: function(val){
        //         return val.length >= 2 || val.length === 0
        //     },
        //     message: () => 'gst cannot be less than 2 characters'
        // }
    },
    invcAmt:{
        type: Number,
        default: 0.00
    },
    taxAmt:{
        type: Number,
        default: 0.00
    },
    gstAmt:{
        type: Number,
        default: 0.00
    },
    remarks: {
        type: String,
        maxlength: 50,
        trim: true
    },
    month: {
        type: String,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        // ref: USERS_COLLECTION_NAME,
        validate: {
			validator: function(v) {
				return validateRefId(model(USERS_COLLECTION_NAME), v);
			},
            message: props => { console.log(props); return `${props.value} is not a valid user id!`}
		}
    },
    st: {
        type: String,
    },
    amt5:{
        type: Number,
        default: 0.00
    },
    amt12:{
        type: Number,
        default: 0.00
    },
    amt12:{
        type: Number,
        default: 0.00
    },
    amt18:{
        type: Number,
        default: 0.00
    },
    amt28:{
        type: Number,
        default: 0.00
    },
    amt0:{
        type: Number,
        default: 0.00
    },
    igst:{
        type: Number,
        default: 0.00
    },
    cgst:{
        type: Number,
        default: 0.00
    },
    sgst:{
        type: Number,
        default: 0.00
    },
},{
    toJSON: {virtuals: true}
});

// invoiceSchema.index( {userId: 1, invcNo: 1}, {unique: true});

invoiceSchema.virtual('loginId', {
    ref: USERS_COLLECTION_NAME, // The model to use
    localField: 'userId', // Find people where `localField`
    foreignField: '_id', // is equal to `foreignField`
    // If `justOne` is true, 'members' will be a single doc as opposed to
    // an array. `justOne` is false by default.
    justOne: true,
    get: (d) => { return d && d.loginID  } //check the object and then use field. Error occurs if populate is not called on the model while querying data
});

// invoiceSchema.virtual('invcDateUI').get(function(){
//     return formatUIDate(this.invcDate);
// });

const invoiceJoiSchema = (minDate, maxDate) => {
    return Joi.object({
        invcType: Joi.number().required().valid(InvoiceType.Sales, InvoiceType.Purchase, InvoiceType.CRN_SR, InvoiceType.DBN_PR),
        invcNo: Joi.string().max(50).required(),
        // invcDate: Joi.date().min(minDate).max(maxDate).required(),
        mode: Joi.string().required().valid(InvoiceMode.B2B, InvoiceMode.B2CS),
        invcDate: Joi.date().required(),
        cr: Joi.string().allow(''),
        code: Joi.string().allow(''),
        name: Joi.string().allow('').max(100),
        town: Joi.string().allow('').max(100),
        gst: Joi.string().allow('').max(15),//.min(2)
        invcAmt: Joi.number().default(0.00),
        taxAmt: Joi.number().default(0.00),
        gstAmt: Joi.number().default(0.00),
        remarks: Joi.string().allow('').max(50),
        month: Joi.string().allow(''),
        st: Joi.string().allow(''),
        amt5: Joi.number().default(0.00),
        amt12: Joi.number().default(0.00),
        amt18: Joi.number().default(0.00),
        amt28: Joi.number().default(0.00),
        amt0: Joi.number().default(0.00),
        igst: Joi.number().default(0.00),
        cgst: Joi.number().default(0.00),
        sgst: Joi.number().default(0.00)
    });

};

function validateInvoiceData(data, minDate, maxDate) {

    const schema = invoiceJoiSchema(minDate, maxDate);

    return schema.validate(data, { stripUnknown: true });
}

const InvoiceModel = model(INVOICES_COLLECTION_NAME, invoiceSchema);

module.exports.validateInvoiceData = validateInvoiceData;
module.exports.InvoiceModel = InvoiceModel;
module.exports.InvoiceType = InvoiceType;
