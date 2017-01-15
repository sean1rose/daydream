/**
 * Created by mike on 8/23/16.
 */
"use strict"

const pgp = require("pg-promise")({
  // Initialization Options
  promiseLib: Promise,
  noLocking: true,
  pgFormatting: true
})

let db

module.exports = (pg, settings) => {
  if (typeof db === "undefined") {
    db = pgp(settings)
    db.connect = pg.connect
    db.disconnect = pg.disconnect
  }
  return db
}
