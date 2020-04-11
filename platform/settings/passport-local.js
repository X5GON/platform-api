// get the local strategy
const LocalStrategy = require("passport-local").Strategy;

/**
 * Adds the local passport strategy.
 * @param {Object} passport - The passport object.
 * @param {Object} pg - The postgresql object.
 */
module.exports = function (passport, pg) {
    /**
     * Verifies the password.
     * @param {Object} user - The user object containing the user password.
     * @param {String} password - The provided password.
     * @returns {Boolean} True if passwords matches.
     */
    function _verifyPassword(user, password) {
        return user.password === password;
    }

    passport.use(new LocalStrategy(
        ((username, password, done) => {
            // get the user specifications
            pg.select({ username }, "admins", (error, users) => {
                if (error) { return done(error); }

                if (users.length === 0 || users.length > 1) {
                    // the user is not in the database
                    return done(null, false);
                }

                const user = users[0];
                if (!_verifyPassword(user, password)) {
                    // the password does not match
                    return done(null, false);
                }
                // return the user information
                return done(null, user);
            });
        })
    ));
};
