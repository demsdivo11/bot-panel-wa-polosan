


const config = {
  owner: [
    "6283111515287", // Pastikan mulai dengan kode negara
    "6283865471987"  // Nomor kedua (bisa dikosongkan)
  ]
};

module.exports = config;


let fs = require('fs')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(`Update ${__filename}`)
delete require.cache[file]
require(file)
})
