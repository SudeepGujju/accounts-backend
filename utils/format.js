const moment = require('moment');
const { InvalidDateFormatError } = require('./error');

function parseCSVDate(date) {

    try{
        if (!date) {
            throw new InvalidDateFormatError('Invalid date');
        }
    
        let momentDate = moment(date + " +05:30", 'DD-MMM-YYYY ZZ', true);
    
        if (!momentDate.isValid()) {
            throw new InvalidDateFormatError('Invalid date');
        }

        return momentDate.toDate();
    }catch(err){
        throw new InvalidDateFormatError('Invalid date');
    }
}

function formatUIDate(date){
    return moment(date).format("DD/MM/YYYY");
}

function parseUIDate(dateString){
    return moment(dateString, "DD/MM/YYYY").toDate();
}

module.exports = {parseCSVDate, formatUIDate, parseUIDate};