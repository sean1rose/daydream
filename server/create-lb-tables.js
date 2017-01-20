"use strict"

const server = require("./server")
const Promise = require("bluebird")

const ds = server.dataSources.db

// migrate one table at a time to prevent overloading the database with connections
// get the tables from the data source directly

let lbTables = Object.keys(ds.connector._models)

ds.adapter.pg.connect((err, client, done) => {
  if (err) {
    throw err
  }
  let automigratePromise
  if (process.env.UPDATE) {
    // update the tables
    lbTables = lbTables.slice(2)
    // production database model last updated 8/30/2016
    automigratePromise = new Promise((resolve) => {
      ds.autoupdate(lbTables, (err) => {
        if (err) {
          throw err
        }
        console.log("The following Loopback tables:\n")
        for (let lbTable of lbTables) {
          console.log(lbTable)
        }
        console.log("\nwere created in " + ds.adapter.name)
        console.log("\n" + lbTables.length + " Loopback tables updated in " + ds.adapter.name + "\n")
        resolve()
      })
    }).then(() => {
      const sqlQuery = "\
        "
      return client.query(sqlQuery)
    })
    // add sql queries to update the foreign keys for the database if needed
  } else {
    // create the tables if UPDATE is not specified as part of the environment variables
    automigratePromise = new Promise((resolve) => {
      ds.automigrate(lbTables, (err) => {
        if (err) {
          throw err
        }
        console.log("The following Loopback tables:\n")
        for (let lbTable of lbTables) {
          console.log(lbTable)
        }
        console.log("\nwere created in " + ds.adapter.name)
        console.log("\n" + lbTables.length + " Loopback tables created in " + ds.adapter.name + "\n")
        resolve()
      })
    }).then(() => {
      // create the admin role
      console.log("Role created: admin in Role table.")
      return ds.models.Role.create({
        name: "admin"
      })
    }).then(() => {
      const sqlQuery = ""
      return client.query(sqlQuery)
    })
  }
  automigratePromise.then(() => {
    console.log("Added additional foreign key constraints onto the table that the Loopback connector doesn't provide natively.")
    done()
    process.exit()
  }).catch(err => {
    console.log(err)
  })
})


