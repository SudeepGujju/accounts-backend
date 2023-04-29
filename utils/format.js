const moment = require('moment');
const { InvalidDateFormatError } = require('./error');

function parseCSVDate(date) {

    try{
        if (!date) {
            throw InvalidDateFormatError('Invalid date');
        }
    
        let momentDate = moment(date + " +05:30", 'DD-MMM-YYYY ZZ', true);
    
        if (!momentDate.isValid()) {
            throw InvalidDateFormatError('Invalid date');
        }
    
        return momentDate.toDate();
    }catch(err){
        throw InvalidDateFormatError('Invalid date');
    }
}

function formatUIDate(date){
    
    return moment(date).format("DD/MM/YYYY");

}

module.exports = {parseCSVDate, formatUIDate};