const moment = require('moment');

function parseCSVDate(date) {

    if (!date) {
        throw Error('Invalid argument');
    }

    let momentDate = moment(date + " +05:30", 'DD-MMM-YYYY ZZ', true);

    if (!momentDate.isValid()) {
        throw Error('Invalid date string');
    }

    return momentDate.toDate();
}

function formatUIDate(date){
    
    return moment(date).format("DD/MM/YYYY");

}

module.exports = {parseCSVDate, formatUIDate};