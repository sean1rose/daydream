"use strict"

const loopback = require("loopback")
const utils = require("loopback-component-passport/lib/models/utils")

module.exports = function (UserIdentity) {

  // <editor-fold desc="Methods for the REST API">
  // method for validation on all remote methods
  UserIdentity.beforeRemote("**", function (context, unused, next) {
    // additional setup to make sure that user doesn"t tamper with arguments
    context.args.data.id = undefined

    next()
  })

  UserIdentity.beforeRemote("create", function (context, unused, next) {
    context.args.data.created = undefined

    next()
  })

  // methods to map profiles from oAuth 2.0 correctly
  /*!
   * Create an access token for the given user
   * @param {User} user The user instance
   * @param {Number} [ttl] The ttl in millisenconds
   * @callback {Function} cb The callback function
   * @param {Error|String} err The error object
   * param {AccessToken} The access token
   */
  function createAccessToken (user, ttl, cb) {
    if (arguments.length === 2 && typeof ttl === "function") {
      cb = ttl
      ttl = 0
    }
    user.accessTokens.create({
      created: new Date(),
      ttl: Math.min(ttl || user.constructor.settings.ttl,
        user.constructor.settings.maxTTL)
    }, cb)
  }

  function profileToUser (provider, profile) {
    // Let"s create a user for that
    const profileEmail = profile.emails && profile.emails[0] &&
      profile.emails[0].value
    let email = profileEmail
    if (!email) {
      email = (profile.username || profile.id) + "@loopback." +
        (profile.provider || provider) + ".com"
    }
    const username = provider + "." + (profile.username || profile.id)
    const password = utils.generateKey("password")
    const userObj = {
      username: username,
      password: password,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName
    }
    if (email) {
      userObj.email = email
    }
    return userObj
  }

  /**
   * Log in with a third-party provider such as Facebook or Google.
   *
   * @param {String} provider The provider name.
   * @param {String} authScheme The authentication scheme.
   * @param {Object} profile The profile.
   * @param {Object} credentials The credentials.
   * @param {Object} [options] The options.
   * @callback {Function} cb The callback function.
   * @param {Error|String} err The error object or string.
   * @param {Object} user The user object.
   * @param {Object} [info] The auth info object.
   *
   * -  identity: UserIdentity object
   * -  accessToken: AccessToken object
   */
  UserIdentity.login = function (provider, authScheme, profile, credentials,
                                 options, cb) {
    options = options || {}
    if (typeof options === "function" && cb === undefined) {
      cb = options
      options = {}
    }
    const autoLogin = options.autoLogin || options.autoLogin === undefined
    const userIdentityModel = utils.getModel(this, UserIdentity)
    profile.id = profile.id || profile.openid
    userIdentityModel.findOne({ where: {
      provider: provider,
      externalId: profile.id
    } }, function (err, identity) {
      if (err) {
        return cb(err)
      }
      if (identity) {
        identity.credentials = credentials
        return identity.updateAttributes({ profile: profile,
          credentials: credentials, modified: new Date() }, function (err, i) {
          // Find the user for the given identity
          return identity.user(function (err, user) {
            // Create access token if the autoLogin flag is set to true
            if (!err && user && autoLogin) {
              return (options.createAccessToken || createAccessToken)(user, function (err, token) {
                cb(err, user, identity, token)
              })
            }
            cb(err, user, identity)
          })
        })
      }
      // Find the user model
      const userModel = (userIdentityModel.relations.user &&
        userIdentityModel.relations.user.modelTo) ||
        loopback.getModelByType(loopback.User)
      const userObj = (options.profileToUser || profileToUser)(provider, profile, options)
      if (!userObj.email && !options.emailOptional) {
        process.nextTick(function () {
          return cb("email is missing from the user profile")
        })
      }

      let query
      if (userObj.email && userObj.username) {
        query = { or: [
          { username: userObj.username },
          { email: userObj.email }
        ] }
      } else if (userObj.email) {
        query = { email: userObj.email }
      } else {
        query = { username: userObj.username }
      }

      userModel.findOrCreate({ where: query }, userObj, function (err, user) {
        if (err) {
          return cb(err)
        }
        const date = new Date()
        userIdentityModel.findOrCreate({ where: { externalId: profile.id } }, {
          provider: provider,
          externalId: profile.id,
          authScheme: authScheme,
          profile: profile,
          credentials: credentials,
          userId: user.id,
          created: date,
          modified: date
        }, function (err, identity) {
          if (!err && user && autoLogin) {
            return (options.createAccessToken || createAccessToken)(user, function (err, token) {
              cb(err, user, identity, token)
            })
          }
          cb(err, user, identity)
        })
      })
    })
  }

  // </editor-fold>
}
