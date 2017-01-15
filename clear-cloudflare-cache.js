/**
 * Created by mike on 6/7/16.
 */

"use strict"

const env = require("./env.json")
const webpackAssets = require("./webpack-assets.json")
require("isomorphic-fetch")

// get the asset paths
let assetValues = Object.keys(webpackAssets).map(key => {
  return webpackAssets[key]
})
let config
if (process.env.NODE_ENV == "staging") {
  config = require("./server/config.staging.json")
} else {
  config = require("./server/config.production.json")
}
const host = config.host
// combine the JS and CSS asset paths to clear
let assets = []
for (let asset of assetValues) {
  if (asset.js) {
    assets.push(`https://${host}\\${asset.js}`)
  } else if (asset.css) {
    assets.push(`https://${host}\\${asset.css}`)
  }
}

fetch("https://api.cloudflare.com/client/v4/zones?name=instataskapp.com&status=active&order=name&direction=desc", {
  headers: {
    "X-Auth-Email": env.cloudflare.email,
    "X-Auth-Key": env.cloudflare.key,
    "Content-Type": "application/json"
  },
  method: "GET"
}).then(response => {
  return response.json().then(responseJSON => {
    // iterate through the zones and clear them based off webpack-assets.json
    let clearZonesPromise = []
    for (let zone of responseJSON.result) {
      if (!zone.paused && zone.permissions.indexOf("#zone:edit") != -1) {
        clearZonesPromise.push(fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/purge_cache`, {
          headers: {
            "X-Auth-Email": env.cloudflare.email,
            "X-Auth-Key": env.cloudflare.key,
            "Content-Type": "application/json"
          },
          method: "DELETE",
          body: JSON.stringify({
            "files": assets
          })
        }))
      }
    }
    return Promise.all(clearZonesPromise)
  })
}).then(() => {
  console.log("Cleared cache for Cloudflare successfully for webpack assets.")
  process.exit()
}).catch(err => {
  console.log(`Clearing cache for Cloudflare for webpack assets failed with error message: ${err.message}.`)
  process.exit(1)
})
