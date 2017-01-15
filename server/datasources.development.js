let DATASTORES, DB, config, connector, extend

extend = require("util")._extend

DB = "postgresql"

DATASTORES = {
  postgresql: {
    host: "localhost",
    port: 5432,
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    poolSize: 5
  }
}

console.error("Using the %s connector.", DB)

connector = DB === "memory" ? DB : "loopback-connector-" + DB

config = extend({
  connector: connector
}, DATASTORES[DB])

module.exports = {
  db: config,
  redis: {
    host: "127.0.0.1"
  }
}
