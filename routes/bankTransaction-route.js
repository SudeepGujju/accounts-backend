const router = require('express').Router();
const path = require('path');
const { BankTransactionModel, validateBankTransactionData } = require('../models');
const { parseError, readCSVFile, deleteFile, parseCSVDate } = require('../utils');
const { diskFileUpload } = require('../middlewares');

router.get("/download-sample", async function (req, res) {

    try {

        const filePath = path.join(process.env.APP_BASE_PATH, "samples", "BANK.csv");

        res.setHeader('x-download-filename', 'BANK.csv');

        return res.status(200).download(filePath);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.get("/:id", async function (req, res) {

    try {
        const account = await BankTransactionModel.findOne({ _id: req.params.id, userId: req.user._id }).select('-userId');

        if (!account)
            return res.status(404).send('Account with given id not found');

        return res.status(200).send(account);
    }
    catch (ex) {
       
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/", async function (req, res) {

    try {

        const { fromAcc, toAcc, fromDate, toDate } = req.query;

        if(!fromAcc && !toAcc && !fromDate && !toDate){
            return res.status(400).send("Invalid/Missing record filters");
        }

        const query = { userId: req.user._id };

        if(fromAcc)
            query.fromAcc = fromAcc;

        if(toAcc)
            query.toAcc = toAcc;

        if(fromDate && toDate)
            query.trnxDate = { $gte: fromDate, $lte: toDate};
        else if(fromDate || toDate)
            query.trnxDate = fromDate || toDate;

        const bankTransactions = await BankTransactionModel.find(query);

        return res.status(200).send(bankTransactions);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/", async function (req, res) {

    try {
        const { error } = validateBankTransactionData(req.body, req.user.finYearStart, req.user.finYearEnd);

        if (error)
            return res.status(400).send(error.details[0].message);

        let bankTransaction = new BankTransactionModel(req.body);

        bankTransaction.userId = req.user._id;

        await bankTransaction.save();

        return res.status(200).send({id: bankTransaction._id, msg: "Bank transaction created successfully"});
    }
    catch (ex) {

        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.put("/:id", async function (req, res) {

    try {
        const { error } = validateBankTransactionData(req.body, req.user.finYearStart, req.user.finYearEnd);

        if (error)
            return res.status(400).send(error.details[0].message);

        const bankTransaction = await BankTransactionModel.findOneAndUpdate({_id: req.params.id, userId: req.user._id}, req.body, { new: true, runValidators: true, context: 'query' });

        if (!bankTransaction)
            return res.status(404).send('Bank transaction with given id not found');

        return res.status(200).send({id: bankTransaction._id, msg: "Bank transaction updated successfully"});
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.delete("/:id", async function (req, res) {

    try {
        const bankTransaction = await BankTransactionModel.findOneAndRemove({_id: req.params.id});

        if (!bankTransaction)
            return res.status(404).send('Bank transaction with given id not found');

        return res.status(200).send("Bank transaction deleted successfully");
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/upload", diskFileUpload().single('file'), async function(req, res){

    try{
        if(!req.file)
            return res.status(400).send('File is required');

        let data = await readCSVFile(req.file.path);

        deleteFile(req.file.path);

        let response = await parseCSVAndCreateBankTransaction(data, req.user._id, req.user.finYearStart, req.user.finYearEnd);

        if(Object.keys(response).length > 0){

            return res.status(200).send(response);

        }else{
            return res.status(400).send("Invalid or empty file.");
        }
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

async function parseCSVAndCreateBankTransaction(records, userID, finYearStart, finYearEnd){

    if(!records || records.length == 0 || (!records[0].TRNXDATE || !records[0].FROMACC || !records[0].TOACC || !records[0].DESC || !(records[0].RECEIVED || records[0].PAID)) )
        return {};

    let successRecords = [], failedRecords = [];
    let totalRecords = records.length;

    records = records.map(async (x) => {

        let _bankTransaction = {};

        let status = {id: "", success: false, errMsg:""};

        try{

            _bankTransaction.fromAcc = x.FROMACC;
            _bankTransaction.toAcc = x.TOACC;

            status.id = (x.TRNXDATE)+"-"+_bankTransaction.fromAcc+"-"+_bankTransaction.toAcc;

            _bankTransaction.trnxDate = parseCSVDate(x.TRNXDATE);

            status.id = (_bankTransaction.trnxDate.getDate()+"/"+(_bankTransaction.trnxDate.getMonth()+1)+"/"+_bankTransaction.trnxDate.getFullYear())+"-"+_bankTransaction.fromAcc+"-"+_bankTransaction.toAcc;

            _bankTransaction.desc = x.DESC;
            _bankTransaction.rno = x.RECEIPT;
            _bankTransaction.received = x.RECEIVED;
            _bankTransaction.paid = x.PAID;

            const { error } = validateBankTransactionData(_bankTransaction, finYearStart, finYearEnd);
    
            if (error)
            {
                status.errMsg = error.details[0].message;
                status.success = false;
                return;
            }

            let bankTransaction = new BankTransactionModel(_bankTransaction);
    
            bankTransaction.userId = userID;
    
            await bankTransaction.save();

            status.success = true;
        }
        catch (ex) {
            const error = parseError(ex);

            status.errMsg =  error.message;
            status.success = false;
        }
        finally
        {
            if(status.success){

                delete status.success;
                successRecords.push(status);
            }else{

                delete status.success;
                failedRecords.push(status)
            }

            return status;
        }
    });

    await Promise.all(records);

    let message = "";
    let statusCode = 0;

    if(totalRecords == failedRecords.length)
    {
        statusCode = 2;
        message = "Error with all bank transactions.";
    }
    else if(totalRecords == successRecords.length)
    {
        statusCode = 0;
        message = "Bank transactions created successfully.";
    }
    else
    {
        statusCode = 1;
        message = "Bank transactions with duplicate/invalid data were not created.";
    }

    let response = {
        totalCount: totalRecords,
        successCount: successRecords.length,
        failedCount: failedRecords.length,
        failedRecs: failedRecords,
        message,
        status: statusCode
    };

    return response;
}

module.exports = router;
