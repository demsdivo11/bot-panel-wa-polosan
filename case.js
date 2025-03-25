require("./config");
const fs = require("fs");
const util = require("util");
const axios = require("axios");
const { exec } = require("child_process");
const menuData = JSON.parse(fs.readFileSync("./menu.json", "utf-8"));


// config
global.domain = "https://panel.dfree.my.id";
global.apiKey = "ptla_TqS4yxcnV0Z1ztkPruOXqSVUrQsDauNaRVZKpkcRdqX";
global.capiKey = "ptlc_J0Wyv0z6kUZNoK963FszKIsC6Z3aRzepEBKDM2BLR6r";
function isUserOwner(m) {
  return config.owner.includes(m.sender.replace(/[^0-9]/g, ""));
}

function checkOwner(m, ptz) {
  if (!isUserOwner(m)) {
      return ptz.sendMessage(m.key.remoteJid, { 
          text: "❌ Perintah ini hanya untuk owner!" 
      }, { quoted: m });
  }
  return true;
}

module.exports = async (ptz, m) => {
  try {
    const body = m.message?.conversation || 
      m.message?.imageMessage?.caption || 
      m.message?.documentMessage?.caption || 
      m.message?.videoMessage?.caption || 
      m.message?.extendedTextMessage?.text || 
      m.message?.buttonsResponseMessage?.selectedButtonId || 
      m.message?.templateButtonReplyMessage?.selectedId || "";

    const budy = typeof m.text === "string" ? m.text : "";
    const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΠΦ_&><`™©®Δ^βα~¦|/\\©^]/;
    const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : ".";
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);
    const text = args.join(" ");
    const sender = m.key.fromMe
      ? ptz.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.key.participant || m.key.remoteJid;
    const botNumber = await ptz.decodeJid(ptz.user.id);
    const senderNumber = sender.split("@")[0];
    const isCreator = global.owner.includes(senderNumber);
    const pushname = m.pushName || `${senderNumber}`;
    const isBot = botNumber.includes(senderNumber);
    console.log("Command yang diterima:", command);

    switch (command) {
      case "menu":
        case "help": {
          
    
            let menuText = "📌 *DAFTAR MENU BOT:*\n";
            menuData.menu.forEach(item => {
                menuText += `\n🔹 *${item.command}*\n    └ ${item.description}`;
            });
            ptz.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
        }
        break;

      case "listserver": {
        if (!checkOwner(m, ptz)) return;
    

        try {
            const response = await axios.get(`${global.domain}/api/application/servers`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
            
            const servers = response.data.data;
            if (servers.length === 0) {
                return ptz.sendMessage(m.key.remoteJid, { text: "Tidak ada server yang ditemukan." }, { quoted: m });
            }
            
            let serverList = "*Daftar Server:*";
            servers.forEach((server, index) => {
                serverList += `
    ${index + 1}. *${server.attributes.name}*
       🔹 ID: ${server.attributes.id}
       🔹 UUID: ${server.attributes.uuid}
       🔹 CPU: ${server.attributes.limits.cpu}%
       🔹 RAM: ${server.attributes.limits.memory} MB
       🔹 Disk: ${server.attributes.limits.disk} MB
       🔹 Suspended: ${server.attributes.suspended ? "✅" : "❌"}
    `;
            });
            
            ptz.sendMessage(m.key.remoteJid, { text: serverList }, { quoted: m });
        } catch (error) {
            console.error("Error fetching servers:", error.response?.data || error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat mengambil daftar server." }, { quoted: m });
        }
    }
    break;


  
      case "adduser": {
        if (!checkOwner(m, ptz)) return;
    
    
        if (args.length < 1) {
            return ptz.sendMessage(m.key.remoteJid, { text: "Gunakan: .adduser <username>" }, { quoted: m });
        }
        
        const username = args[0];
        const email = `${username}@gmail.com`;
        const apiUrl = `${global.domain}/api/application/users`;
        
        try {
            const response = await axios.post(apiUrl, {
                email: email,
                username: username,
                first_name: username,
                last_name: "User"
            }, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
            
            ptz.sendMessage(m.key.remoteJid, { text: `User berhasil dibuat!\n\n🔹 *Username:* ${username}\n📧 *Email:* ${email}` }, { quoted: m });
        } catch (error) {
            console.error("Error creating user:", error.response?.data || error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat membuat user." }, { quoted: m });
        }
    }
    break;
    
    case "updateuser": {
      if (!checkOwner(m, ptz)) return;
    
  
        if (args.length < 2) {
            return ptz.sendMessage(m.key.remoteJid, { text: "Gunakan: .updateuser <username> <password>" }, { quoted: m });
        }
        
        const username = args[0];
        const password = args[1];
        
        try {
            const getUsers = await axios.get(`${global.domain}/api/application/users`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
            
            const user = getUsers.data.data.find(u => u.attributes.username === username);
            if (!user) {
                return ptz.sendMessage(m.key.remoteJid, { text: "User tidak ditemukan." }, { quoted: m });
            }
            
            const userId = user.attributes.id;
            const updateUrl = `${global.domain}/api/application/users/${userId}`;
            
            await axios.patch(updateUrl, {
                email: user.attributes.email,
                username: username,
                first_name: user.attributes.first_name,
                last_name: user.attributes.last_name,
                language: "en",
                password: password
            }, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
            
            ptz.sendMessage(m.key.remoteJid, { text: `User berhasil diperbarui!\n\n🔹 *Username:* ${username}\n🔒 *Password Baru:* ${password}` }, { quoted: m });
        } catch (error) {
            console.error("Error updating user:", error.response?.data || error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat memperbarui user." }, { quoted: m });
        }
    }
    break;

      case "listuser": {
        if (!checkOwner(m, ptz)) return;
    
   
        
        const apiUrl = `${global.domain}/api/application/users`;
        
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
            
            const users = response.data.data;
            if (!users || users.length === 0) {
                return ptz.sendMessage(m.key.remoteJid, { text: "Tidak ada user yang ditemukan." }, { quoted: m });
            }
            
            let userList = "*Daftar User Pterodactyl:*\n";
            users.forEach(user => {
                userList += `\n🔹 *Username:* ${user.attributes.username}\n📧 *Email:* ${user.attributes.email}\n🆔 *UUID:* ${user.attributes.uuid}\n🔰 *Admin:* ${user.attributes.root_admin ? "✅ Ya" : "❌ Tidak"}\n`;
            });
            
            ptz.sendMessage(m.key.remoteJid, { text: userList }, { quoted: m });
        } catch (error) {
            console.error("Error fetching users:", error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat mengambil daftar user." }, { quoted: m });
        }
      }
      

      default:
        if (budy.startsWith("=>")) {
          if (!isCreator) return;
          try {
            let result = await eval(`(async () => { return ${text || "undefined"} })()`);
            ptz.sendMessage(m.key.remoteJid, { text: util.format(result) }, { quoted: m });
          } catch (e) {
            ptz.sendMessage(m.key.remoteJid, { text: String(e) }, { quoted: m });
          }
        }

        if (budy.startsWith(">")) {
          if (!isCreator) return;
          try {
            let result = await eval(`(async () => { ${text ? `return ${text}` : ""} })()`);
            ptz.sendMessage(m.key.remoteJid, { text: util.format(result) }, { quoted: m });
          } catch (e) {
            ptz.sendMessage(m.key.remoteJid, { text: String(e) }, { quoted: m });
          }
        }

        if (budy.startsWith("$")) {
          if (!isCreator) return;
          exec(budy.slice(1), { timeout: 5000 }, (err, stdout) => {
            if (err) return ptz.sendMessage(m.key.remoteJid, { text: `Error: ${err.message}` }, { quoted: m });
            if (stdout.trim()) return ptz.sendMessage(m.key.remoteJid, { text: stdout }, { quoted: m });
          });
        }
    }
  } catch (err) {
    console.log(util.format(err));
  }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`Update ${__filename}`);
  delete require.cache[file];
  require(file);
});
