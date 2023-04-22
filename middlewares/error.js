const {parseError} = require('../utils/error');

module.exports = function(err, req, res, next){

    return res.status(500).send(parseError(err).message);
}