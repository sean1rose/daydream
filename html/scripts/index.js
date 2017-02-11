require("isomorphic-fetch")
const fs = require("fs")
const path = require("path")

const currentYearDataDirectory = path.resolve(__dirname, "../data/2016")
if (!fs.existsSync(currentYearDataDirectory)) {
  fs.mkdirSync(currentYearDataDirectory)
}

const playsHTMLPath = path.resolve(currentYearDataDirectory, "quarterback-plays.html")
if (process.env.REPLACE_HTML || !fs.existsSync(playsHTMLPath)) {
  fetch("http://thehuddle.com/stats/2016/plays_std.php").then(response => {
    return response.text()
  }).then(body => {
    const playsHTMLPath = path.resolve(currentYearDataDirectory, "plays.html")
    fs.writeFileSync(playsHTMLPath, body)
  }).catch(err => {
    console.trace('Error fetching quarterbacks from thehuddle.com', err)
  })
}

