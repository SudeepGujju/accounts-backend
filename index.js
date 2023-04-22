require('dotenv').config({ path: `${process.env.NODE_ENV}.env` })
const express = require("express");
const http = require("http");

process.env.APP_BASE_PATH = __dirname;

const { logger } = require('./initial-config/config-logger');

const app = express();

app.use( function(req, res, next){
    console.log(req.url + " - " + req.method + " - " + req.ip);
    next();
});

require("./initial-config/config-app")(app);

require("./initial-config/config-database")();

require("./initial-config/config-routes")(app);


const server = http.createServer(app);

server.listen(process.env.PORT, () => {
    logger.info(`Http Server started on port ${process.env.PORT}.`);
});