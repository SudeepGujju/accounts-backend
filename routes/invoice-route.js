const router = require('express').Router();
const path = require('path');
const { InvoiceModel, validateInvoiceData, InvoiceType } = require("../models");
const { parseError, readCSVFile, deleteFile, parseCSVDate } = require('../utils');
const { diskFileUpload } = require('../middlewares');

router.get("/download-sample", async function (req, res) {

    try {

        const filePath = path.join(process.env.APP_BASE_PATH, "samples", "INVOICE.csv");

        res.setHeader('x-download-filename', 'INVOICE.csv');

        return res.status(200).download(filePath);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.get("/", async function (req, res) {

    try {

        const { invcType, fromDate, toDate } = req.query;

        // if(!invcType && !fromDate && !toDate){
        //     return res.status(400).send("Invalid/Missing record filters");
        // }

        const query = { userId: req.user._id };

        if(invcType)
            query.invcType = invcType;

        if(fromDate && toDate)
            query.invcDate = { $gte: fromDate, $lte: toDate};
        else if(fromDate || toDate)
            query.invcDate = fromDate || toDate;

        const invoices = await InvoiceModel.find(query);

        return res.status(200).send(invoices);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.delete("/allInvoices", async function (req, res) {

    try {

        const { userId } = req.query;

        if(!userId){
            return res.status(400).send("Invalid/Missing user Id");
        }

        const invoices = await InvoiceModel.deleteMany({userId: userId});

        if (invoices.deletedCount == 0)
            return res.status(200).send('No invoices to delete');

        return res.status(200).send("Invoices deleted successfully");
    }
    catch (ex) {
        console.log(ex)
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.delete("/:id", async function (req, res) {

    try {
        const invoice = await InvoiceModel.findOneAndRemove({_id: req.params.id});

        if (!invoice)
            return res.status(404).send('Invoice with given id not found');

        return res.status(200).send("Invoice deleted successfully");
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

        let response = await parseCSVAndCreateInvoice(data, req.body.userId, req.user.finYearStart, req.user.finYearEnd);

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

async function parseCSVAndCreateInvoice(records, userID, finYearStart, finYearEnd){

    if(!records || records.length == 0 || (!records[0].TYPE || !records[0].INVNO || !records[0].INVDATE) )
        return {};

    let successRecords = [], failedRecords = [];
    let createdCount = 0, updatedCount = 0;
    let totalRecords = records.length;

    records = records.map(async (x) => {

        let _invoice = {};

        let status = {id: "", success: false, errMsg:""};

        try{

            _invoice.invcNo = x.INVNO;

            status.id = _invoice.invcNo;

            switch(x.TYPE.trim().toUpperCase())
            {
                case "SALES": _invoice.invcType = InvoiceType.Sales; break;
                case "PURCHASE": _invoice.invcType = InvoiceType.Purchase; break;
                case "CRN/SR": _invoice.invcType = InvoiceType.CRN_SR; break;
                case "DBN/PR": _invoice.invcType = InvoiceType.DBN_PR; break;
            }

            _invoice.invcNo = x.INVNO;
            _invoice.mode = x.MODE;
            _invoice.invcDate = parseCSVDate(x.INVDATE);
            _invoice.cr = x.CR;
            _invoice.code = x.CODE1;
            _invoice.name = x.NAME;
            _invoice.town = x.TOWN;
            _invoice.gst = x.GSTIN;
            _invoice.invcAmt = x.INVAMT;
            _invoice.taxAmt = x.TAXBUL;
            _invoice.gstAmt = x.GST;
            _invoice.remarks = x.REMARKS;
            _invoice.month = x.MONTH;
            _invoice.st = x.ST;
            _invoice.amt5 = x.AMT5;
            _invoice.amt12 = x.AMT12;
            _invoice.amt18 = x.AMT18;
            _invoice.amt28 = x.AMT28;
            _invoice.amt0 = x.AMT0;
            _invoice.igst = x.IGST;
            _invoice.cgst = x.CGST;
            _invoice.sgst = x.SGST;

            const { error } = validateInvoiceData(_invoice, finYearStart, finYearEnd);
    
            if (error)
            {
                status.errMsg = error.details[0].message;
                status.success = false;
                return;
            }

            // let invoice = new InvoiceModel(_invoice);
    
            // invoice.userId = userID;
    
            // await invoice.save();

            _invoice.userId = userID;

            //Update if record already exist
            const res = await InvoiceModel.updateOne( { userId: userID, invcType: _invoice.invcType, invcNo: _invoice.invcNo, mode: _invoice.mode, invcDate: _invoice.invcDate }, _invoice, {upsert: true} );

            res.upsertedCount === 0 ? (updatedCount++) : (createdCount++)

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
        message = "Error with all invoices.";
    }
    else if(totalRecords == successRecords.length)
    {
        statusCode = 0;
        message = "Invoices created/updated successfully.";
    }
    else
    {
        statusCode = 1;
        message = "Invoices with duplicate/invalid data were not created.";
    }

    let response = {
        totalCount: totalRecords,
        successCount: successRecords.length,
        failedCount: failedRecords.length,
        createdCount,
        updatedCount,
        failedRecs: failedRecords,
        message,
        status: statusCode
    };

    return response;
}

module.exports = router;
