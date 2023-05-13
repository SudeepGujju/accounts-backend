const router = require('express').Router();
const bcrypt = require('bcrypt');
const { ActiveUserModel, validateLoginData, UserModel, UserStatus } = require('../models');
const { parseError, getParsedSchemaToken, parseUIDate } = require('../utils');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { TOKEN_ALGORITHM, TOKEN_VALIDITY, TOKEN_PUBLIC_KEY, TOKEN_PRIVATE_KEY } = require('../constants');

router.post("/login", async function(req, res){

	try
	{
        let {error} = validateLoginData(req.body);

		if(error)
            return res.status(400).send(error.details[0].message);

		let user = await UserModel.findOne({'loginID': req.body.loginID, 'status': UserStatus.Active});

		if(!user)
            return res.status(400).send("Invalid credentials");

		let isValid = await bcrypt.compare(req.body.password, user.password);

		if(!isValid)
            return res.status(400).send("Invalid credentials");

        //const token = user.generateAuthToken();

        const userDetails = { 
			loginID: user.loginID,
			username: user.username,
			finYearStart: user.finYearStart,
			finYearEnd: user.finYearEnd,
			_id: user._id,
			userType: user.userType,
			pageAccess: user.pageAccess
		};

		let finYearStart = parseUIDate(user.finYearStart);
		let finYearEnd = parseUIDate(user.finYearEnd);

		finYearStart.setHours(0);
		finYearStart.setMinutes(0);
		finYearStart.setSeconds(0);
		finYearStart.setMilliseconds(0);

		finYearEnd.setHours(23);
		finYearEnd.setMinutes(59);
		finYearEnd.setSeconds(59);
		finYearEnd.setMilliseconds(999);

		userDetails.finYearStart = finYearStart;
		userDetails.finYearEnd = finYearEnd;

		let {accessToken, refreshToken} = generateTokens(user._id);

		const activeUser = new ActiveUserModel({
			accessToken: accessToken,
			refreshToken: refreshToken,
			user: {
				loginID: userDetails.loginID,
				username: userDetails.username,
				finYearStart: userDetails.finYearStart,
				finYearEnd: userDetails.finYearEnd,
				_id: userDetails._id,
				userType: userDetails.userType
			},
			lastAccessed: new Date()
		});

		await activeUser.save();

        return res.status(200).send({user: userDetails, tokens: { accessToken, refreshToken } });
    }
	catch(ex)
	{
		// console.log(e);
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
	}
});

router.post("/logout", async function(req, res){

	try
	{
		//No need to wait until logged out successfully.
		ActiveUserModel.deleteOne({'accessToken': getParsedSchemaToken(req) }).exec();
	}
	catch(ex)
	{
		//console.log(ex);
	}

	return res.status(200).send("Logged out successfully.");
});

router.post("/refresh", async function(req, res){

	try
	{
		const refreshToken = req.body.refreshToken;

		let oldAcessToken = getParsedSchemaToken(req);

		const activeUser = await ActiveUserModel.findOne({'refreshToken': refreshToken });

		if(!activeUser)
		{
			throw new Error("User session expired");
		}

		let bIsTokenExpired = false;

		try
		{
			jwt.verify(oldAcessToken, TOKEN_PUBLIC_KEY, {algorithms: [TOKEN_ALGORITHM]} );
		}
		catch(e)
		{
			if(e instanceof jwt.TokenExpiredError){
				bIsTokenExpired = true;
			}
		}

		if(bIsTokenExpired)
		{
			let accessToken = generateAccessToken(activeUser.user._id);

			activeUser.accessToken = accessToken;
			activeUser.lastAccessed = new Date();

			await activeUser.save();

			return res.status(200).send({accessToken});
		}
	}
	catch(ex)
	{
		// console.log(ex);
	}

	return res.status(401).send("Session expired. Please relogin.");
});

function generateTokens(userId){
	const refreshToken = crypto.randomBytes(16).toString('hex');

	const accessToken = generateAccessToken(userId);

	return {accessToken, refreshToken};
}//generateTokens

function generateAccessToken(userId){

	const payload = {sub: userId };

	const accessToken = jwt.sign(
		payload,
		TOKEN_PRIVATE_KEY,
		{algorithm: TOKEN_ALGORITHM, expiresIn: TOKEN_VALIDITY }
	);

	return accessToken;
}//generateAccessToken

module.exports = router;
