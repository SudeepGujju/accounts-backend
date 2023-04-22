const router = require('express').Router();
const path = require('path');
const { TransactionModel, validateTransactionData } = require('../models');
const { parseError, readCSVFile, deleteFile, parseCSVDate } = require('../utils');
const { fileUploadHandler } = require('../middlewares');

router.get("/download-sample", async function (req, res) {

    try {

        const filePath = path.join(process.env.APP_BASE_PATH, "samples", "TRANSACTION.csv");

        res.setHeader('x-download-filename', 'TRANSACTION.csv');

        return res.status(200).download(filePath);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.get("/:id", async function (req, res) {

    try {
        const account = await TransactionModel.findOne({ _id: req.params.id, userId: req.user._id }).select('-userId');

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

        const transactions = await TransactionModel.find(query);

        return res.status(200).send(transactions);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/", async function (req, res) {

    try {
        const { error } = validateTransactionData(req.body, req.user.finYearStart, req.user.finYearEnd);

        if (error)
            return res.status(400).send(error.details[0].message);

        let transaction = new TransactionModel(req.body);

        transaction.userId = req.user._id;

        await transaction.save();

        return res.status(200).send({id: transaction._id, msg: "Transaction created successfully"});
    }
    catch (ex) {

        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.put("/:id", async function (req, res) {

    try {
        const { error } = validateTransactionData(req.body, req.user.finYearStart, req.user.finYearEnd);

        if (error)
            return res.status(400).send(error.details[0].message);

        const transaction = await TransactionModel.findOneAndUpdate({_id: req.params.id, userId: req.user._id}, req.body, { new: true, runValidators: true, context: 'query' });

        if (!transaction)
            return res.status(404).send('Transaction with given id not found');

        return res.status(200).send({id: transaction._id, msg: "Transaction updated successfully"});
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.delete("/:id", async function (req, res) {

    try {
        const transaction = await TransactionModel.findOneAndRemove({_id: req.params.id});

        if (!transaction)
            return res.status(404).send('Transaction with given id not found');

        return res.status(200).send("Transaction deleted successfully");
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/upload", fileUploadHandler().single('file'), async function(req, res){

    try{
        if(!req.file)
            return res.status(400).send('File is required');

        let data = await readCSVFile(req.file.path);

        deleteFile(req.file.path);

        let response = await parseCSVAndCreateTransaction(data, req.user._id, req.user.finYearStart, req.user.finYearEnd);

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

async function parseCSVAndCreateTransaction(records, userID, finYearStart, finYearEnd){

    if(!records || records.length == 0 || (!records[0].TRNXDATE || !records[0].FROMACC || !records[0].TOACC || !records[0].DESC || !(records[0].RECEIVED || records[0].PAID)) )
        return {};

    let successRecords = [], failedRecords = [];
    let totalRecords = records.length;

    records = records.map(async (x) => {

        let _transaction = {};

        let status = {id: "", success: false, errMsg:""};

        try{

            _transaction.fromAcc = x.FROMACC;
            _transaction.toAcc = x.TOACC;

            status.id = (x.TRNXDATE)+"-"+_transaction.fromAcc+"-"+_transaction.toAcc;

            _transaction.trnxDate = parseCSVDate(x.TRNXDATE);

            status.id = (_transaction.trnxDate.getDate()+"/"+(_transaction.trnxDate.getMonth()+1)+"/"+_transaction.trnxDate.getFullYear())+"-"+_transaction.fromAcc+"-"+_transaction.toAcc;

            _transaction.desc = x.DESC;
            _transaction.rno = x.RECEIPT;
            _transaction.received = x.RECEIVED;
            _transaction.paid = x.PAID;

            const { error } = validateTransactionData(_transaction, finYearStart, finYearEnd);
    
            if (error)
            {
                status.errMsg = error.details[0].message;
                status.success = false;
                return;
            }

            let transaction = new TransactionModel(_transaction);
    
            transaction.userId = userID;
    
            await transaction.save();

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
        message = "Error with all transactions.";
    }
    else if(totalRecords == successRecords.length)
    {
        statusCode = 0;
        message = "Transactions created successfully.";
    }
    else
    {
        statusCode = 1;
        message = "Transactions with duplicate/invalid data were not created.";
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
