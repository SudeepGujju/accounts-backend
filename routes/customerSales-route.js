const router = require('express').Router();
const { InvoiceModel } = require("../models");
const { parseError } = require('../utils');

router.get("/", async function (req, res) {

    try {

        const { gst, invcType, fromDate, toDate } = req.query;

        if(!gst){
            return res.status(400).send("GST ID filter is missing");
        }

        // if( !invcType && !fromDate && !toDate){
        //     return res.status(400).send("Invalid/Missing record filters");
        // }

        const query = {gst: gst};

        if(invcType)
            query.invcType = invcType;

        if(fromDate && toDate)
            query.invcDate = { $gte: fromDate, $lte: toDate};
        else if(fromDate || toDate)
            query.invcDate = fromDate || toDate;

        const invoices = await InvoiceModel.find(query).populate('loginId');

        return res.status(200).send(invoices);
    }
    catch (ex) {
        
        const error = parseError(ex);
        return res.status(error.code).send(error.message);
    }

});

module.exports = router;
