const userRoutes = require("./user-route");
const authRoutes = require("./auth-route");
const groupRoutes = require("./group-route");
const accountRoutes = require("./account-route");
const transactionRoutes = require("./transaction-route");
const invoiceRoutes = require("./invoice-route");
const customerSalesRoutes = require("./customerSales-route");
const bankTransactionRoutes = require("./bankTransaction-route");

module.exports = { userRoutes, authRoutes, groupRoutes, accountRoutes, transactionRoutes, invoiceRoutes, customerSalesRoutes, bankTransactionRoutes };