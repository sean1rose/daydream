const app = require("../server/server")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")

const currentYearDataDirectory = path.resolve(__dirname, "../html/data/2016")
const playsHTMLPath = path.resolve(currentYearDataDirectory, "plays.html")

if (fs.existsSync(playsHTMLPath)) {
  const body = fs.readFileSync(playsHTMLPath, "utf8")
  const $ = cheerio.load(body)
  const properties = $(".mod-table thead tr:nth-child(2) th a").toArray().map(property => {
    return property.children[0].data.toLowerCase()
  })
  const tableRows = $(".mod-table tbody tr")
  let playerArray = []
  for (let row = 0; row < tableRows.length; row++) {
    const tableRow = tableRows.filter(`:nth-child(${row + 1})`)
    let player = {}
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i]
      let selector
      if (property === "player") {
        selector = `td:nth-child(1) a`
      } else {
        selector = `td:nth-child(${i + 1})`
      }
      const playerInfo = tableRow.find(selector).text()
      if (property === "player") {
        player.name = playerInfo.trim()
      } else if (property === "nfl") {
        player[property] = playerInfo.trim()
      } else if (property === "fpts/g") {
        player[property] = parseFloat(playerInfo)
      } else {
        player[property] = parseInt(playerInfo)
      }
    }
    player.position = "Quarterback"
    playerArray.push(player)
  }
  console.log(playerArray)
  return app.dataSources.db.models.player.create(playerArray).catch(err => {
    console.trace('Error from saving data for players', err)
  })
}
