const router = require('express').Router();
const bcrypt = require('bcrypt');
const { userDataCleanUp } = require('../jobs');
const { validateUserData, UserModel, UserStatus, UserType } = require('../models');
const { parseError } = require('../utils');

router.get("/dropdown", async function (req, res) {

    try {
        const users = await UserModel.find({ status: UserStatus.Active, userType: UserType.User, }).select('_id username').lean();

        return res.status(200).send(users);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/:id", async function(req, res){

    try {
        const user = await UserModel.findOne({_id: req.params.id, status: {'$ne': UserStatus.Deleted} }).select('-password -dataClean');

        if (!user)
            return res.status(404).send('User not found');

        return res.status(200).send(user);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.get("/", async function (req, res) {

    try {

        const query = {};

        // if(req.query.includeCurrentUser == 'N')
        query._id = {$ne: req.user._id};
        query.status = {$ne: UserStatus.Deleted};

        const users = await UserModel.find(query).select('-password');

        return res.status(200).send(users);
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.post("/", async function(req, res){

    try {
        const { error } = validateUserData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);

        if (!await isLoginIDAvailabile(req.body.loginID))
            return res.status(400).send("User with same login ID already exists");

        let user = new UserModel(req.body);

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        await user.save();

        return res.status(200).send("User created successfully");
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

router.put("/:id", async function (req, res) {

    try {
        const { error } = validateUserData(req.body);

        if (error)
            return res.status(400).send(error.details[0].message);
        
        if(req.body.password)
        {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);   
        }

        const account = await UserModel.findOneAndUpdate({_id: req.params.id}, req.body, { runValidators: true, context: 'query' });//new: true,

        if (!account)
            return res.status(404).send('User not found');

        return res.status(200).send("User updated successfully");
    }
    catch (ex) {

        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

router.delete("/:id", async function (req, res) {
    try {
        // const user = await UserModel.findOneAndRemove({_id: req.params.id});
        const user = await UserModel.findOneAndUpdate({_id: req.params.id}, {status: UserStatus.Deleted}, { runValidators: true, context: 'query' });//new: true,

        if (!user)
            return res.status(404).send("User not found.");

        userDataCleanUp(req.params.id);

        // return res.status(200).send("User deleted successfully");
        return res.status(200).send("User and all his data will be removed in sometime");
    }
    catch (ex) {
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }
});

async function isLoginIDAvailabile(loginID) {

    let bUserAvail = true;

    try {

        let user = await UserModel.findOne({ 'loginID': loginID });

        if (user)
            bUserAvail = false;//Not Available
    }
    catch (ex) {
        console.log(ex);
    }

    return bUserAvail;
}

module.exports = router;