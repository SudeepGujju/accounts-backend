const fs = require('fs');

const TOKEN_ALGORITHM = "RS256";
const TOKEN_VALIDITY = 15 * 60; //15 Mins -> 15 * 60 Seconds;
const TOKEN_PUBLIC_KEY = fs.readFileSync(process.env.APP_BASE_PATH+process.env.JWT_PUBLIC_KEY_PATH, {encoding: 'utf-8'});
const TOKEN_PRIVATE_KEY = fs.readFileSync(process.env.APP_BASE_PATH+process.env.JWT_PRIVATE_KEY_PATH, {encoding: 'utf-8'})

const AUTHORIZATION_HEADER = "Authorization";

module.exports = {
  TOKEN_ALGORITHM,
  TOKEN_VALIDITY,
  AUTHORIZATION_HEADER,
  TOKEN_PUBLIC_KEY,
  TOKEN_PRIVATE_KEY
};
