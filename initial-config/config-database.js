const mongoose = require("mongoose");
const { logger } = require("./config-logger");

module.exports = async function () {
  const { DB_URL, APP_NAME, INVOICES_FILE_BUCKET_NAME } = process.env;

  try {
    const db = mongoose.connection;

    db.on("connected", function () {
      logger.info("Mongoose connected to " + DB_URL);

      new mongoose.mongo.GridFSBucket(db,{bucketName: INVOICES_FILE_BUCKET_NAME});

    });

    db.on("error", function (err) {
      logger.error("Mongoose connection error " + err);
    });

    db.on("disconnected", function () {
      logger.info("Mongoose disconnected");
    });

    process.on("SIGINT", function () {
      db.close(function () {
        logger.info("Mongoose connection closed through app termination");
        process.exit(0);
      });
    });

    //Establish connection to mongoDB. Below method returns promise. If any error occurs during connection error wil be thrown.
    await mongoose.connect(DB_URL, { appName: APP_NAME });

  } catch (e) {

    logger.error(e);
    process.exit(1);

  }
};
