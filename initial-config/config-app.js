const express = require("express");
const cors = require('cors');
const compression = require("compression");
const helmet = require("helmet");
const passport = require('passport');

module.exports = function(app){

    app.set('env', process.env.NODE_ENV);

    app.use(helmet());

    app.disable('x-powered-by');

    app.use(compression());

    /*
    ** origin: Access-Control-Allow-Origin
    ** methods: Access-Control-Allow-Methods
    ** allowedHeaders: Access-Control-Allow-Headers - default Access-Control-Request-Headers
    ** exposedHeaders: Access-Control-Expose-Headers
    ** credentials: Access-Control-Allow-Credentials - to transfer cookies
    ** maxAge: Access-Control-Max-Age
    ** preflightContinue:
    ** optionsSuccessStatus: For successful OPTIONS requests choke on 204 status code
    */
    const corsOptions = {
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTION'],
        //exposedHeaders: [AUTHORIZATION_HEADER],
        optionsSuccessStatus: 200,
        //origin: ["https://localhost:4200"]
    };

    app.use(cors(corsOptions));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    require('./config-passport')(passport);

    app.use(passport.initialize());
}