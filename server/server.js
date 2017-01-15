require("dotenv").config()

const loopback = require("loopback")
const boot = require("loopback-boot")
const loopbackPassport = require("loopback-component-passport")
const path = require("path")

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */

const flash = require("connect-flash")
// customization for passport configurator's configure provider method to allow for better error messages
const passport = require("passport")
const _ = require("lodash")

const app = module.exports = loopback()

const PassportConfigurator = loopbackPassport.PassportConfigurator
const passportConfigurator = new PassportConfigurator(app)
app.use(flash())

app.set("views", path.join(__dirname, "./views"))
app.set("view engine", "pug")

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit("started")
    const baseUrl = app.get("url").replace(/\/$/, "")
    console.log("Web server listening at: %s", baseUrl)
    if (app.get("loopback-component-explorer")) {
      const explorerPath = app.get("loopback-component-explorer").mountPath
      console.log("Browse your REST API at %s%s", baseUrl, explorerPath)
    }
})
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start()
})


let config = {}

try {
  config = require("../providers.json")

} catch (error) {
  console.error("Please configure your passport strategy in `providers.json`.")
  process.exit(1)
}

app.middleware("auth", loopback.token({
  model: app.models.accessToken, currentUserLiteral: "me"
}))
const cookieParser = require("cookie-parser")
const session = require("express-session")
// store session information on Redis
const RedisStore = require("connect-redis")(session)

app.middleware("session:before", cookieParser(app.get("cookieSecret"), {maxAge: 86400}))

let options
if (process.env.NODE_ENV === "development") {
  options = {
    host: app.dataSources.redis.settings.host
  }
} else {
  // on production, store session redis in separate database URL
  options = {
    host: app.dataSources.sessionRedis.settings.host,
    port: app.dataSources.sessionRedis.settings.port,
    password: app.dataSources.sessionRedis.settings.password
  }
}
const store = new RedisStore(options)
//noinspection JSValidateTypes
app.middleware("session", session({
  store: store,
  secret: "yVT3Y0qdF2tUOk8GqdcG",
  saveUninitialized: true,
  resave: true
}))

passportConfigurator.init()

//noinspection JSUnresolvedVariable
passportConfigurator.setupModels({
  userModel: app.models.user,
  userIdentityModel: app.models.userIdentity,
  userCredentialModel: app.models.userCredential
})

passportConfigurator.configureProvider = function(name, options) {
  const self = this
  options = options || {}
  const link = options.link
  const AuthStrategy = require(options.module)[options.strategy || "Strategy"]

  let authScheme = options.authScheme
  if (!authScheme) {
    // Guess the authentication scheme
    if (options.consumerKey) {
      authScheme = "oAuth1"
    } else if (options.realm) {
      authScheme = "OpenID"
    } else if (options.clientID) {
      authScheme = "oAuth 2.0"
    } else if (options.usernameField) {
      authScheme = "local"
    } else {
      authScheme = "local"
    }
  }
  const clientID = options.clientID
  const clientSecret = options.clientSecret
  const callbackURL = options.callbackURL
  const authPath = options.authPath || ((link ? "/link/" : "/auth/") + name)
  const callbackPath = options.callbackPath || ((link ? "/link/" : "/auth/") +
    name + "/callback")
  const callbackHTTPMethod = options.callbackHTTPMethod !== "post" ? "get" : "post"

  // remember returnTo position, set by ensureLoggedIn
  const successRedirect = (req) => {
    if (req && req.session && req.session.returnTo) {
      const returnTo = req.session.returnTo
      delete req.session.returnTo
      return returnTo
    }
    return options.successRedirect ||
      (link ? "/link/account" : "/auth/account")
  }
  const failureRedirect = options.failureRedirect ||
    (link ? "/link.html" : "/login.html")
  const scope = options.scope
  const authType = authScheme.toLowerCase()

  const session = !!options.session

  const loginCallback = options.loginCallback || function(req, done) {
      return function(err, user, identity, token) {
        const authInfo = {
          identity: identity
        }
        if (token) {
          authInfo.accessToken = token
        }
        done(err, user, authInfo)
      }
    }

  switch (authType) {
    case "ldap":
      passport.use(name, new AuthStrategy(_.defaults({
          usernameField: options.usernameField || "username",
          passwordField: options.passwordField || "password",
          session: options.session, authInfo: true,
          passReqToCallback: true
        }, options),
        function(req, user, done) {
          if (user) {
            const LdapAttributeForUsername = options.LdapAttributeForUsername || "cn"
            const LdapAttributeForMail = options.LdapAttributeForMail || "mail"
            const externalId = user[options.LdapAttributeForLogin || "uid"]
            const email = [].concat(user[LdapAttributeForMail])[0]
            const profile = {
              username: [].concat(user[LdapAttributeForUsername])[0],
              id: externalId
            }
            if (email) {
              profile.emails = [{value: email}]
            }
            const OptionsForCreation = _.defaults({
              autoLogin: true
            }, options)
            self.userIdentityModel.login(name, authScheme, profile, {},
              OptionsForCreation, loginCallback(req, done))
          }
          else {
            done(null)
          }
        }
      ))
      break
    case "local":
      passport.use(name, new AuthStrategy(_.defaults({
          usernameField: options.usernameField || "username",
          passwordField: options.passwordField || "password",
          emailVerificationRequired: options.emailVerificationRequired || false,
          session: options.session, authInfo: true
        }, options),
        function(username, password, done) {
          const query = {
            where: {
              or: [
                {username: username},
                {email: username}
              ]
            }
          }
          self.userModel.findOne(query, function(err, user) {
            if (err)
              return done(err)

            if (user) {
              const u = user.toJSON()
              delete u.password
              const userProfile = {
                provider: "local",
                id: u.id,
                username: u.username,
                emails: [
                  {
                    value: u.email
                  }
                ],
                status: u.status,
                accessToken: null
              }

              // If we need a token as well, authenticate using Loopbacks
              // own login system, else defer to a simple password check
              //will grab user info from providers.json file.  Right now
              //this only can use email and username, which are the 2 most common
              if (options.setAccessToken) {
                switch (options.usernameField) {
                  case  "email":
                    login({email: username, password: password})
                    break
                  case "username":
                    login({username: username, password: password})
                    break
                }

                //noinspection JSAnnotator
                function login(creds) {
                  self.userModel.login(creds,
                    function(err, accessToken) {
                      if (err) {
                        return done(err)
                      }
                      if (accessToken) {
                        userProfile.accessToken = accessToken
                        done(null, userProfile, {accessToken: accessToken})
                      } else {
                        done(null, false, {message: "Failed to create token."})
                      }
                    })
                }
              }

              return user.hasPassword(password, function(err, ok) {
                // Fail to login if email is not verified or invalid username/password.
                // Unify error message in order not to give indication about the error source for
                // security purposes.

                // adds a email verification option to allow for an option to require email verification later
                let errorMsg
                if (ok && user.emailVerified) {
                  return done(null, userProfile)
                } else if (ok) {
                  errorMsg = "The email has not been verified."
                  return done(null, user, {message: errorMsg})
                } else {
                  errorMsg = "Invalid username/password combination. Please check your entries and try again."
                  done(null, false, {message: errorMsg})
                }
              })
            }

            const errorMsg = "Invalid username/password combination. Please check your entries and try again."
            done(null, false, {message: errorMsg})
          })
        }
      ))
      break
    case "oauth":
    case "oauth1":
    case "oauth 1.0":
      passport.use(name, new AuthStrategy(_.defaults({
          consumerKey: options.consumerKey,
          consumerSecret: options.consumerSecret,
          callbackURL: callbackURL,
          passReqToCallback: true
        }, options),
        function(req, token, tokenSecret, profile, done) {
          if (link) {
            if (req.user) {
              self.userCredentialModel.link(
                req.user.id, name, authScheme, profile,
                {token: token, tokenSecret: tokenSecret}, options, done)
            } else {
              done("No user is logged in")
            }
          } else {
            self.userIdentityModel.login(name, authScheme, profile,
              {
                token: token,
                tokenSecret: tokenSecret
              }, options, loginCallback(req, done))
          }
        }
      ))
      break
    case "openid":
      passport.use(name, new AuthStrategy(_.defaults({
          returnURL: options.returnURL,
          realm: options.realm,
          callbackURL: callbackURL,
          passReqToCallback: true
        }, options),
        function(req, identifier, profile, done) {
          if (link) {
            if (req.user) {
              self.userCredentialModel.link(
                req.user.id, name, authScheme, profile,
                {identifier: identifier}, options, done)
            } else {
              done("No user is logged in")
            }
          } else {
            self.userIdentityModel.login(name, authScheme, profile,
              {identifier: identifier}, options, loginCallback(req, done))
          }
        }
      ))
      break
    case "openid connect":
      passport.use(name, new AuthStrategy(_.defaults({
          clientID: clientID,
          clientSecret: clientSecret,
          callbackURL: callbackURL,
          passReqToCallback: true
        }, options),
        function(req, accessToken, refreshToken, profile, done) {
          if (link) {
            if (req.user) {
              self.userCredentialModel.link(
                req.user.id, name, authScheme, profile,
                {
                  accessToken: accessToken,
                  refreshToken: refreshToken
                }, options, done)
            } else {
              done("No user is logged in")
            }
          } else {
            self.userIdentityModel.login(name, authScheme, profile,
              {accessToken: accessToken, refreshToken: refreshToken},
              options, loginCallback(req, done))
          }
        }
      ))
      break
    default:
      passport.use(name, new AuthStrategy(_.defaults({
          clientID: clientID,
          clientSecret: clientSecret,
          callbackURL: callbackURL,
          passReqToCallback: true
        }, options),
        function(req, accessToken, refreshToken, profile, done) {
          if (link) {
            if (req.user) {
              self.userCredentialModel.link(
                req.user.id, name, authScheme, profile,
                {
                  accessToken: accessToken,
                  refreshToken: refreshToken
                }, options, done)
            } else {
              done("No user is logged in")
            }
          } else {
            self.userIdentityModel.login(name, authScheme, profile,
              {accessToken: accessToken, refreshToken: refreshToken},
              options, loginCallback(req, done))
          }
        }
      ))
  }

  const defaultCallback = function(req, res, next) {
    // The default callback
    passport.authenticate(name, _.defaults({session: session},
      options.authOptions), function(err, user, info) {
      if (err) {
        return next(err)
      }
      if (!user) {
        if (options.json) {
          return res.status(401).json("authentication error")
        }
        return res.redirect(failureRedirect)
      }
      if (session) {
        req.logIn(user, function(err) {
          if (err) {
            return next(err)
          }
          if (info && info.accessToken) {
            if (options.json) {
              return res.json({
                "access_token": info.accessToken.id,
                userId: user.id
              })
            } else {
              res.cookie("access_token", info.accessToken.id,
                {
                  signed: req.signedCookies ? true : false,
                  // maxAge is in ms
                  maxAge: 1000 * info.accessToken.ttl,
                  domain: (options.domain) ? options.domain : null
                })
              res.cookie("userId", user.id.toString(), {
                signed: req.signedCookies ? true : false,
                maxAge: 1000 * info.accessToken.ttl,
                domain: (options.domain) ? options.domain : null
              })
            }
          }
          return res.redirect(successRedirect(req))
        })
      } else {
        if (info && info.accessToken) {
          if (options.json) {
            return res.json({
              "access_token": info.accessToken.id,
              userId: user.id
            })
          } else {
            res.cookie("access_token", info.accessToken.id, {
              signed: req.signedCookies ? true : false,
              maxAge: 1000 * info.accessToken.ttl
            })
            res.cookie("userId", user.id.toString(), {
              signed: req.signedCookies ? true : false,
              maxAge: 1000 * info.accessToken.ttl
            })
          }
        }
        return res.redirect(successRedirect(req))
      }
    })(req, res, next)
  }
  /*
   * Redirect the user to Facebook for authentication.  When complete,
   * Facebook will redirect the user back to the application at
   * /auth/facebook/callback with the authorization code
   */
  if (authType === "local") {
    self.app.post(authPath, passport.authenticate(
      name, options.fn || _.defaults({
        successReturnToOrRedirect: options.successReturnToOrRedirect,
        successRedirect: options.successRedirect,
        failureRedirect: options.failureRedirect,
        successFlash: options.successFlash,
        failureFlash: options.failureFlash,
        scope: scope, session: session
      }, options.authOptions)))
  } else if (authType === "ldap") {
    const ldapCallback = options.customCallback || defaultCallback
    self.app.post(authPath, ldapCallback)
  } else if (link) {
    self.app.get(authPath, passport.authorize(name, _.defaults({
      scope: scope,
      session: session
    }, options.authOptions)))
  } else {
    self.app.get(authPath, passport.authenticate(name, _.defaults({
      scope: scope,
      session: session
    }, options.authOptions)))
  }

  /*
   * Facebook will redirect the user to this URL after approval. Finish the
   * authentication process by attempting to obtain an access token using the
   * authorization code. If access was granted, the user will be logged in.
   * Otherwise, authentication has failed.
   */
  if (link) {
    self.app[callbackHTTPMethod](callbackPath, passport.authorize(name, _.defaults({
        session: session,
        // successReturnToOrRedirect: successRedirect,
        successRedirect: successRedirect(),
        failureRedirect: failureRedirect
      }, options.authOptions)),
      // passport.authorize doesn"t handle redirect
      (req, res, next) => {
        res.redirect(successRedirect(req))
      }, (err, req, res, next) => {
        if (options.failureFlash) {
          if (typeof req.flash !== "function") {
            next(new TypeError("req.flash is not a function"))
          }
          let flash = options.failureFlash
          if (typeof flash === "string") {
            flash = { type: "error", message: flash }
          }

          const type = flash.type || "error"
          const msg = flash.message || err.message
          if (typeof msg === "string") {
            req.flash(type, msg)
          }
        }
        res.redirect(failureRedirect)
      })
  } else {
    const customCallback = options.customCallback || defaultCallback
    // Register the path and the callback.
    self.app[callbackHTTPMethod](callbackPath, customCallback)
  }
}

for (const s in config) {
  let c = config[s]
  c.session = c.session !== false
  passportConfigurator.configureProvider(s, c)
}
