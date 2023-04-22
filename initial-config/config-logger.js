const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = winston.createLogger({
    exitOnError: true,
    handleExceptions: true,
    handleRejections: true,
    transports: [
      new DailyRotateFile({
        dirname: process.env.APP_BASE_PATH+process.env.LOG_PATH,
        filename: '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        frequency: '24h',
        // maxSize: '2*1024*1024', //2MB Max FileSize
        format: winston.format.combine(
            winston.format.label(),
            winston.format.json(),
            winston.format.timestamp()
        )
      })
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

process.on('uncaughtException', function(error){

  console.error(`uncaughtException: `,error);
  logger.error(`uncaughtException: ${error}`)

});

process.on('unhandledRejection', function(error){

  console.error(`unhandledRejection: ${error}`);

})

module.exports.logger = logger;
