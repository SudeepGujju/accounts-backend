require('express-async-errors');

const passport = require('passport');

const {errorHandler}  = require('../middlewares');
const { userRoutes, authRoutes, groupRoutes, accountRoutes, transactionRoutes, invoiceRoutes, bankTransactionRoutes, customerSalesRoutes } = require('../routes');

module.exports = function(app){

    const {API_BASE_PATH} = process.env;

    app.use(API_BASE_PATH+"/auth", authRoutes);
    app.use(API_BASE_PATH+"/users", passport.authenticate('jwt', {session: false}), userRoutes);
    app.use(API_BASE_PATH+"/group", passport.authenticate('jwt', {session: false}), groupRoutes);
    app.use(API_BASE_PATH+"/account", passport.authenticate('jwt', {session: false}), accountRoutes);
    app.use(API_BASE_PATH+"/transaction", passport.authenticate('jwt', {session: false}), transactionRoutes);
    app.use(API_BASE_PATH+"/invoice", passport.authenticate('jwt', {session: false}), invoiceRoutes);
    app.use(API_BASE_PATH+"/customer-sales", passport.authenticate('jwt', {session: false}), customerSalesRoutes);
    app.use(API_BASE_PATH+"/bank", passport.authenticate('jwt', {session: false}), bankTransactionRoutes);

    app.use('**', function (req, res) {
        return res.status(404).send('Invalid request method/url');
    });

    app.use(errorHandler);

}