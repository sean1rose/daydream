/**
 * Created by mike on 4/11/16.
 */

"use strict"

const path = require("path")

function slugify (name) {
  name = name.replace(/^[A-Z]+/, s => s.toLowerCase())
  return name.replace(/[A-Z]/g, s => "-" + s.toLowerCase())
}

module.exports = (Model) => {
  const configFile = path.join(__dirname, "../models/", slugify(Model.modelName) + ".json")
  const config = require(configFile)

  if (!config || !config.acls) {
    console.error("ClearBaseAcls: Failed to load model config from", configFile)
    return
  }

  Model.settings.acls.length = 0
  config.acls.forEach(r => Model.settings.acls.push(r))
}
