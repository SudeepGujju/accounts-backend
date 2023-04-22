const router = require('express').Router();
const path = require('path');
const { GroupModel, validateGroupData, GroupType } = require("../models");
const { parseError, readCSVFile, deleteFile } = require('../utils');
const { fileUploadHandler } = require('../middlewares');

router.get("/dropdown", async function (req, res) {

    try {
        const groups = await GroupModel.find({ userId: req.user._id }).select('code name -_id').lean();

        return res.status(200).send(groups);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/download-sample", async function (req, res) {

    try {

        const filePath = path.join(process.env.APP_BASE_PATH, "samples", "GROUP.csv");

        res.setHeader('x-download-filename', 'GROUP.csv');

        return res.status(200).download(filePath);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.get("/:id", async function (req, res) {

    try {
        const group = await GroupModel.findOne({ _id: req.params.id, userId: req.user._id }).select('-userId');

        if (!group)
            return res.status(404).send('Group with given id not found');

        return res.status(200).send(group);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/", async function (req, res) {

    try {
        const groups = await GroupModel.find({ userId: req.user._id }).select('-userId');

        return res.status(200).send(groups);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.post("/", async function (req, res) {

    try {
        const { error } = validateGroupData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);

        if (!await isCodeAvailabile(req.body.code, req.user._id))
            return res.status(400).send("code already exists");

        let group = new GroupModel(req.body);

        group.userId = req.user._id;

        await group.save();

        return res.status(200).send("Group created successfully");
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.put("/:id", async function (req, res) {

    try {
        const { error } = validateGroupData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);

        const group = await GroupModel.findOneAndUpdate({_id: req.params.id}, {
            name: req.body.name,
            grpType: req.body.grpType
        }, { new: true, runValidators: true, context: 'query' });

        if (!group)
            return res.status(404).send('Group with given id not found');

        return res.status(200).send("Group updated successfully");
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.delete("/:id", async function (req, res) {

    try {
        const group = await GroupModel.findOneAndRemove({_id: req.params.id});

        if (!group)
            return res.status(404).send('Group with given id not found');

        return res.status(200).send("Group deleted successfully");
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

        let response = await parseCSVAndCreateGroup(data, req.user._id);

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

        let group = await GroupModel.findOne({ 'code': code, 'userId': userID });

        if (group)
            bCodeAvail = false;//Not Available
    }
    catch (ex) {
        console.log(ex);
    }

    return bCodeAvail;
}

async function parseCSVAndCreateGroup(records, userID)
{
    if(!records || records.length == 0 || (!records[0].TYPE || !records[0].CODE || !records[0].NAME) )
        return {};

    let successRecords = [], failedRecords = [];
    let totalRecords = records.length;

    records = records.map(async (x) => {

        let _group = {};

        let status = {id: "", success: false, errMsg:""};

        try {

            _group.code = x.CODE.toUpperCase();

            status.id = _group.code;

            switch(x.TYPE.trim().toUpperCase())
            {
                case "TRADING": _group.grpType = GroupType.Trading; break;
                case "PROFIT AND LOSS": _group.grpType = GroupType.ProfitAndLoss; break;
                case "BALANCE SHEET": _group.grpType = GroupType.BalanceSheet; break;
            }

            _group.name = x.NAME.toUpperCase();

            const { error } = validateGroupData(_group);
    
            if (error)
            {
                status.errMsg = error.details[0].message;
                status.success = false;
                return;
            }
    
            if (!await isCodeAvailabile(_group.code, userID))
            {
                status.errMsg = "code already exists";
                status.success = false;
                return;    
            }

            let group = new GroupModel(_group);

            group.userId = userID;

            await group.save();

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
        message = "Error with all groups.";
    }
    else if(totalRecords == successRecords.length)
    {
        statusCode = 0;
        message = "Groups created successfully.";
    }
    else
    {
        statusCode = 1;
        message = "Groups with duplicate/invalid data were not created.";
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
