/**
 * Configurate the passport object for authentication.
 * @param {Object} passport - The passport object.
 */
module.exports = function (passport, pg) {
    // used to serialize the user for the session
    passport.serializeUser((user, done) => {
        done(null, user);
    });

    // used to deserialize the object gor the session
    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    // passport configuration
    require("./passport-local")(passport, pg);
};
