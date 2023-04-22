const { AUTHORIZATION_HEADER } = require("../constants");

function getAccessToken(req) {
  return req.header(AUTHORIZATION_HEADER) || "";
}

function parseSchemaToken(token) {
  var tokenRegEx = /(\S+)\s+(\S+)/;

  if (typeof token !== "string") {
    return null;
  }

  var matches = token.match(tokenRegEx);
  return matches && matches[2];
}

function getParsedSchemaToken(req) {
  const token = getAccessToken(req);

  if (!token) null;

  return parseSchemaToken(token);
}

module.exports.getParsedSchemaToken = getParsedSchemaToken;
