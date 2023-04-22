const router = require('express').Router();
const path = require('path');
const { AccountModel, validateAccountData } = require('../models');
const { parseError, readCSVFile, deleteFile } = require('../utils');
const { fileUploadHandler } = require('../middlewares');

router.get("/dropdown", async function (req, res) {

    try {
        const accounts = await AccountModel.find({ userId: req.user._id }).select('code firmName -_id').lean();

        return res.status(200).send(accounts);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/download-sample", async function (req, res) {

    try {

        const filePath = path.join(process.env.APP_BASE_PATH, "samples", "ACCOUNT.csv");

        res.setHeader('x-download-filename', 'ACCOUNT.csv');

        return res.status(200).download(filePath);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.get("/:id", async function (req, res) {

    try {
        const account = await AccountModel.findOne({ _id: req.params.id, userId: req.user._id }).select('-userId');

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
        const accounts = await AccountModel.find({ userId: req.user._id }).select('code firmName town proprietor phone gst groupCode opngBalAmt _id');

        return res.status(200).send(accounts);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/", async function (req, res) {

    try {

        const { error } = validateAccountData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);

        if (!await isCodeAvailabile(req.body.code, req.user._id))
            return res.status(400).send("code already exists");

        let account = new AccountModel(req.body);

        account.userId = req.user._id;

        await account.save();

        return res.status(200).send("Account created successfully");
    }
    catch (ex) {

        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.put("/:id", async function (req, res) {

    try {
        const { error } = validateAccountData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);

        // firmName: req.body.firmName,
        // proprietor: req.body.proprietor,
        // phone: req.body.phone,
        // dno: req.body.dno,
        // strtNo: req.body.strtNo,
        // area: req.body.area,

        const account = await AccountModel.findOneAndUpdate({_id: req.params.id, userId: req.user._id}, req.body, { new: true, runValidators: true, context: 'query' });

        if (!account)
            return res.status(404).send('Account with given id not found');

        return res.status(200).send("Account updated successfully");
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.delete("/:id", async function (req, res) {

    try {
        const account = await AccountModel.findOneAndRemove({_id: req.params.id});

        if (!account)
            return res.status(404).send('Account with given id not found');

        return res.status(200).send("Account deleted successfully");
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

        let response = await parseCSVAndCreateAccount(data, req.user._id);

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

async function isCodeAvailabile(code, userID) {

    let bCodeAvail = true;

    try {
        if (code)
            code = code.trim().toUpperCase();

        let account = await AccountModel.findOne({ 'code': code, 'userId': userID });

        if (account)
            bCodeAvail = false;
    }
    catch (ex) {
        console.log(ex);
    }
    return bCodeAvail;
}

async function parseCSVAndCreateAccount(records, userID){

    if(!records || records.length == 0 || (!records[0].CCODE || !records[0].CNAME || !records[0].GROUP))
        return {};

    let successRecords = [], failedRecords = [];
    let totalRecords = records.length;

    records = records.map(async (x) => {

        let _account = {};

        let status = {id: "", success: false, errMsg:""};

        try{

            _account.code = x.CCODE.toUpperCase();

            status.id = _account.code;

            x.PHONE.replace = x.PHONE.replace(/[^\d]/g, '')

            _account.firmName = x.CNAME;
            _account.proprietor = x.PROPR;
            _account.phone = x.PHONE.length == 10 ? x.PHONE : '';
            _account.dno = x.CADD1
            _account.strtNo = x.CADD2;
            _account.area = "";
            _account.town = x.CTOWN;
            _account.dl1 = x.CDLNO1;
            _account.dl2 = x.CDLNO2;
            _account.gst = x.GSTNO;
            _account.mailid = x.EMAIL;
            _account.opngBalAmt = isNaN(x.OPENING) ? '0.00' : parseFloat(x.OPENING).toFixed(2);
            _account.groupCode = x.GROUP.toUpperCase();

            const { error } = validateAccountData(_account);
    
            if (error)
            {
                status.errMsg = error.details[0].message;
                status.success = false;
                return;
            }
    
            if (!await isCodeAvailabile(_account.code, userID))
            {
                status.errMsg = "code already exists";
                status.success = false;
                return;    
            }

            let account = new AccountModel(_account);
    
            account.userId = userID;
    
            await account.save();

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
        message = "Error with all accounts.";
    }
    else if(totalRecords == successRecords.length)
    {
        statusCode = 0;
        message = "Accounts created successfully.";
    }
    else
    {
        statusCode = 1;
        message = "Accounts with duplicate/invalid data were not created.";
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
