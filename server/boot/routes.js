"use strict"

const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn
const path = require("path")
const Promise = require("bluebird")
const passport = require("passport")
const providerOptions = require("../../providers.json")

module.exports = function (app) {
  const host = () => {
    let host
    if (process.env.NODE_ENV === "development") {
      host = app.get("host")
    } else if (process.env.NODE_ENV === "staging") {
      const config = require("../config.staging.json")

      host = config.host
    } else {
      const config = require("../config.production.json")

      host = config.host
    }
    return host
  }
  const port = () => {
    if (process.env.NODE_ENV === "development") {
      return app.get("port")
    } else {
      return 443
    }
  }
  app.get("/auth/google/callback", passport.authenticate("google-login", providerOptions["google-login"]))
  app.get("/", (req, res) => {
    const user = req.user
    if (typeof req.user === "object" && user.emailVerified) {
      res.redirect("/app")
      return
    }
    res.render("pages/index", {
      title: "Fantasy Football Stats - Daydream",
      url: req.url,
      host: host(),
      port: port()
    })
  })

  app.get("/signin", function (req, res) {
    let emailError
    const user = req.user
    let loginFailure
    const error = req.flash("error")
    if (error.length > 0) {
      loginFailure = "Invalid username or password"
    }
    if (typeof req.user === "object") {
      if (!user.emailVerified) {
        emailError = true
      } else {
        res.redirect("/app")
        return
      }
    }
    res.render("pages/signin", {
      title: "Sign In - Daydream",
      url: req.url,
      host: host(),
      port: port(),
      error: loginFailure,
      emailError: emailError,
      verified: req.query.verified,
      user: req.user
    })
  })

  function logout (req, res) {
    req.logout()
    res.redirect("/signed-out")
  }

  app.get("/signout", function (req, res) {
    if (typeof req.session.accessToken !== "undefined") {
      app.models.accessToken.findOne({
        where: {
          id: req.session.accessToken.id
        }
      }).then((accessToken) => {
        if (accessToken !== null) {
          const destroyAccessToken = accessToken.destroy()
          const destroySession = req.session.destroy()
          Promise.all([ destroyAccessToken, destroySession ]).then(() => {
            logout(req, res)
          })
        } else {
          // in error cases where the access token is expired or already destroyed
          req.session.destroy().then(() => {
            logout(req, res)
          })
        }
      })
    } else {
      req.session.destroy()
      logout(req, res)
    }
  })

  app.get("/signed-out", function (req, res) {
    res.render("pages/signed-out", {
      title: "Daydream",
      host: host(),
      port: port()
    })
  })

  app.get("/signup", function (req, res) {
    const user = req.user
    if (user !== null && user.emailVerified) {
      res.redirect("/app/dashboard")
      return
    }
    res.render("pages/signup", {
      title: "Create An Account - Daydream",
      url: req.url,
      host: host(),
      port: port(),
      firstName: req.query.firstName,
      lastName: req.query.lastName,
      email: req.query.email
    })
  })

  // reset password
  app.get("/reset-password", function (req, res) {
    res.render("pages/reset-password", {
      title: "Reset Password - Daydream",
      host: host(),
      port: port(),
      accessToken: req.accessToken
    })
  })

  app.get("/about", function (req, res) {
    res.render("pages/about", {
      title: "About - Daydream",
      host: host(),
      port: port()
    })
  })

  // other links -- non-navigation links
  if (process.env.NODE_ENV === "development") {
    app.get("/email/verify", function (req, res) {
      res.render(__dirname + "/../../src/views/email/verify.ejs", {
        text: "Thanks for choosing Daydream!\nWe just need your to verify your email address before your sign up is completed! Please click the link below to verify your email:\n\t{href}\nThanks,\n- The Daydream Team",
        verifyHref: "https://www.Daydream.com",
        user: {
          firstName: "Mike"
        },
        host: host(),
        port: port()
      })
    })
  }

  app.get("/reset-password", function (req, res) {
    res.render("pages/password-reset", {
      host: host(),
      port: port()
    })
  })
}
