const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { TOKEN_PUBLIC_KEY, TOKEN_ALGORITHM } = require('../constants');
const { ActiveUserModel } = require('../models');
const { getParsedSchemaToken } = require('../utils');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: TOKEN_PUBLIC_KEY,
  algorithms: [TOKEN_ALGORITHM],
  ignoreExpiration: false,
  passReqToCallback: true,
};

//index.js will pass the global passport object here, and this function will configure it
module.exports = function (passport) {
  // The JWT payload is passed into the verify callback
  passport.use(
    new JwtStrategy(options, async function (req, jwt_payload, cb) {
      let activeUser = null;

      try {
        activeUser = await ActiveUserModel.findOne(
          { accessToken: getParsedSchemaToken(req) },
          { user: 1 }
        );

        if (!activeUser) return cb(null, false);
      } catch (err) {
        return cb(err, false);
      }

      activeUser.lastAccessed = new Date();

      try {
        activeUser = await activeUser.save();

        activeUser = activeUser.toObject();

        return cb(null, activeUser.user);
      } catch (err) {
        return cb(err, false);
      }
    })
  );
};
