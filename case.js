const config = require("./config");

const fs = require("fs");
const util = require("util");
const axios = require("axios");
const { exec } = require("child_process");
const menuData = JSON.parse(fs.readFileSync("./menu.json", "utf-8"));


// config
global.domain = "https://panel.dfree.my.id";
global.apiKey = "ptla_TqS4yxcnV0Z1ztkPruOXqSVUrQsDauNaRVZKpkcRdqX";
global.capiKey = "ptlc_J0Wyv0z6kUZNoK963FszKIsC6Z3aRzepEBKDM2BLR6r";
const ownerList = Array.isArray(config.owner) ? config.owner : [];
global.owner = Array.isArray(config.owner) ? config.owner : [];

function isUserOwner(m) {
    if (!ownerList || !Array.isArray(ownerList)) {
        console.error("Config owner tidak ditemukan atau bukan array.");
        return false;
    }
    if (!m.sender) {
        console.error("Error: m.sender tidak ditemukan.");
        return false;
    }
    return ownerList.includes(m.sender.replace(/[^0-9]/g, ""));
}

function checkOwner(m, ptz) {
    if (!isUserOwner(m)) {
        ptz.sendMessage(m.key.remoteJid, { text: "❌ Anda bukan owner!" }, { quoted: m });
        return false;
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
    if (["menu", "help"].includes(command)) {
      let menuText = "📌 *DAFTAR MENU BOT:*\n jangan lupa menggunakan . sebelum menggunakan command \n";
      menuData.menu.forEach(item => {
        menuText += `\n🔹 *${item.command}*\n    └ ${item.description}`;
      });
      await ptz.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
    }

    switch (command) {
      case "addown": {
        // Hanya 6283111515287 yang bisa gunakan command ini
        if (senderNumber !== "6283111515287") {
            return ptz.sendMessage(m.key.remoteJid, { 
                text: "❌ Hanya owner utama (6283111515287) yang bisa menambahkan owner!" 
            }, { quoted: m });
        }
    
        // Ambil nomor target (reply atau args)
        let targetNumber;
        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetNumber = m.message.extendedTextMessage.contextInfo.participant.split('@')[0];
        } else if (args[0]) {
            targetNumber = args[0].replace(/[^0-9]/g, ""); // Hapus karakter non-angka
        } else {
            return ptz.sendMessage(m.key.remoteJid, { 
                text: "Cara pakai:\n.addown <nomor>\natau reply pesan seseorang"
            }, { quoted: m });
        }
    
        // Validasi minimal 10 digit angka
        if (targetNumber.length < 10 || !/^\d+$/.test(targetNumber)) {
            return ptz.sendMessage(m.key.remoteJid, { 
                text: "Format nomor invalid! Harus angka minimal 10 digit.\nContoh: 6281234567890"
            }, { quoted: m });
        }
    
        try {
            const currentConfig = require("./config");
            
            // Cek duplikat
            if (currentConfig.owner.includes(targetNumber)) {
                return ptz.sendMessage(m.key.remoteJid, { 
                    text: `Nomor ${targetNumber} sudah terdaftar sebagai owner!`
                }, { quoted: m });
            }
    
            // Tambahkan owner baru (tanpa ubah format)
            currentConfig.owner.push(targetNumber);
    
            // Update config.js
            const configContent = `const config = {
      owner: ${JSON.stringify(currentConfig.owner, null, 2)}
    };
    
    module.exports = config;`;
    
            fs.writeFileSync("./config.js", configContent);
    
            // Reload config
            delete require.cache[require.resolve("./config")];
            global.owner = require("./config").owner;
    
            ptz.sendMessage(m.key.remoteJid, { 
                text: `✅ Owner baru ditambahkan!\n\nNomor: ${targetNumber}\nTotal owner: ${currentConfig.owner.length}`
            }, { quoted: m });
    
        } catch (error) {
            console.error("Gagal menambah owner:", error);
            ptz.sendMessage(m.key.remoteJid, { 
                text: "Gagal menambah owner. Cek log untuk detail."
            }, { quoted: m });
        }
    }
    break;
    case "listown": {
      if (!checkOwner(m, ptz)) return;
  
      try {
          const currentConfig = require("./config");
          let listText = "📱 *Daftar Owner*:\n";
          
          currentConfig.owner.forEach((num, idx) => {
              listText += `\n${idx + 1}. ${num} ${num === "6283111515287" ? "(🌟 Main Owner)" : ""}`;
          });
  
          ptz.sendMessage(m.key.remoteJid, { text: listText }, { quoted: m });
      } catch (error) {
          ptz.sendMessage(m.key.remoteJid, { 
              text: "Gagal mengambil daftar owner." 
          }, { quoted: m });
      }
  }
  break;
  case "delown": {
    // Hanya 6283111515287 yang bisa hapus owner
    if (senderNumber !== "6283111515287") {
        return ptz.sendMessage(m.key.remoteJid, { 
            text: "❌ Hanya owner utama (6283111515287) yang bisa menghapus owner!" 
        }, { quoted: m });
    }

    if (!args[0]) {
        return ptz.sendMessage(m.key.remoteJid, { 
            text: "Cara pakai:\n.delown <nomor>\nContoh: .delown 628123456789" 
        }, { quoted: m });
    }

    // Ambil nomor (tanpa auto-format)
    const targetNumber = args[0].replace(/[^0-9]/g, "");

    // Validasi minimal 10 digit
    if (targetNumber.length < 10) {
        return ptz.sendMessage(m.key.remoteJid, { 
            text: "Nomor harus minimal 10 digit angka!" 
        }, { quoted: m });
    }

    try {
        const currentConfig = require("./config");

        // Cek apakah nomor ada di list owner
        const index = currentConfig.owner.indexOf(targetNumber);
        if (index === -1) {
            return ptz.sendMessage(m.key.remoteJid, { 
                text: `Nomor ${targetNumber} tidak ditemukan di daftar owner!` 
            }, { quoted: m });
        }

        // Jangan izin hapus diri sendiri (6283111515287)
        if (targetNumber === "6283111515287") {
            return ptz.sendMessage(m.key.remoteJid, { 
                text: "❌ Tidak bisa menghapus owner utama!" 
            }, { quoted: m });
        }

        // Hapus dari array
        currentConfig.owner.splice(index, 1);

        // Update config.js
        const configContent = `const config = {
  owner: ${JSON.stringify(currentConfig.owner, null, 2)}
};

module.exports = config;`;

        fs.writeFileSync("./config.js", configContent);

        // Reload config
        delete require.cache[require.resolve("./config")];
        global.owner = require("./config").owner;

        ptz.sendMessage(m.key.remoteJid, { 
            text: `✅ Berhasil menghapus owner!\n\nNomor: ${targetNumber}\nSisa owner: ${currentConfig.owner.length}` 
        }, { quoted: m });

    } catch (error) {
        console.error("Gagal menghapus owner:", error);
        ptz.sendMessage(m.key.remoteJid, { 
            text: "Gagal menghapus owner. Cek log untuk detail." 
        }, { quoted: m });
    }
}
break;
      case "listnode": {
        if (!checkOwner(m, ptz)) return;
    
        try {
            const nodeResponse = await axios.get(`${global.domain}/api/application/nodes`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
    
            const nodes = nodeResponse.data.data.map(node => `🔹 *Nama:* ${node.attributes.name}\n🆔 *UUID:* ${node.attributes.uuid}`).join("\n\n");
    
            ptz.sendMessage(m.key.remoteJid, {
                text: `Daftar Node:\n\n${nodes}`
            }, { quoted: m });
        } catch (error) {
            console.error("Error fetching nodes:", error.response?.data || error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat mengambil daftar node." }, { quoted: m });
        }
    }
    break;
    case "cpanel": {
      if (!checkOwner(m, ptz)) return;
  
      if (args.length < 4) {
          return ptz.sendMessage(m.key.remoteJid, { 
              text: `📋 *Usage:* .cpanel <username> <server_name> <CPU%> <DiskMB> <RamMB>\nSet 0 for unlimited resources` 
          }, { quoted: m });
      }
  
      const username = args[0];
      const serverName = args[1];
      const cpu = parseInt(args[2]);
      const disk = parseInt(args[3]);
      const ram = parseInt(args[4]);
  
      // Input validation
      if ([cpu, disk, ram].some(isNaN)) {
          return ptz.sendMessage(m.key.remoteJid, { 
              text: "❌ Invalid input! CPU/Disk/RAM must be numbers." 
          }, { quoted: m });
      }
  
      try {
          // 1. Check username exists using filter
          const userCheck = await axios.get(`${global.domain}/api/application/users?filter[username]=${encodeURIComponent(username)}`, {
              headers: { 
                  "Authorization": `Bearer ${global.capiKey}`,
                  "Accept": "application/json"
              }
          });
  
          if (userCheck.data.meta.pagination.total === 0) {
              return ptz.sendMessage(m.key.remoteJid, { 
                  text: `❌ Username "${username}" not found in panel!\nUse .adduser first to create account.` 
              }, { quoted: m });
          }
  
          const user = userCheck.data.data[0].attributes;
  
          // 2. Node selection with available allocations
          const nodes = await axios.get(`${global.domain}/api/application/nodes?include=allocations`, {
              headers: { "Authorization": `Bearer ${global.capiKey}` }
          });
  
          const bestNode = nodes.data.data.find(node => 
              node.attributes.relationships.allocations.data.some(a => !a.attributes.assigned)
          );
  
          if (!bestNode) {
              return ptz.sendMessage(m.key.remoteJid, { 
                  text: "❌ No nodes with free allocations available!" 
              }, { quoted: m });
          }
  
          // 3. Create server
          await axios.post(`${global.domain}/api/application/servers`, {
              name: serverName,
              user: user.id,
              egg: 15,
              nest: 5,
              docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
              startup: "npm start",
              environment: {
                  "CMD_RUN": "npm start",
                  "JS_FILE": "index.js",
                  "P_SERVER_LOCATION": bestNode.attributes.uuid,
                  "P_SERVER_UUID": bestNode.attributes.uuid
              },
              limits: {
                  memory: ram || 0,
                  swap: 0,
                  disk: disk || 0,
                  io: 500,
                  cpu: cpu || 0
              },
              feature_limits: {
                  databases: 5,
                  backups: 1,
                  allocations: 1
              },
              allocation: {
                  default: bestNode.attributes.relationships.allocations.data
                      .find(a => !a.attributes.assigned).attributes.id
              }
          }, {
              headers: { "Authorization": `Bearer ${global.capiKey}` }
          });
  
          // 4. Send response
          const message = `
  ✅ *SERVER CREATED SUCCESSFULLY*
  
  🔗 *Panel URL:* ${global.domain}
  👤 *Username:* ${user.username}
  📧 *Email:* ${user.email}
  🖥 *Server:* ${serverName}
  
  ⚙️ *Resources*
  ▸ RAM: ${ram || "Unlimited"} MB
  ▸ CPU: ${cpu || "Unlimited"}%
  ▸ Disk: ${disk || "Unlimited"} MB
  
  📍 *Node:* ${bestNode.attributes.name}
  🆔 *User ID:* ${user.id}
  
  ⚠️ Use existing account password
  `;
  
          ptz.sendMessage(m.key.remoteJid, { 
              text: message,
              contextInfo: {
                  externalAdReply: {
                      title: `${serverName} Panel`,
                      body: `Created for ${user.username}`,
                      thumbnail: await fetchThumbnail()
                  }
              }
          }, { quoted: m });
  
      } catch (error) {
          const errorMsg = error.response?.data?.errors?.[0]?.detail || 
                         "Check panel resources/availability";
                         
          ptz.sendMessage(m.key.remoteJid, { 
              text: `❌ *CREATION FAILED*\n\n${errorMsg}` 
          }, { quoted: m });
      }
  }
  break;
  
  // Helper function
  async function fetchThumbnail() {
      try {
          return (await axios.get("https://i.ibb.co/0jQYfK9/ptero-logo.png", { 
              responseType: "arraybuffer",
              timeout: 5000 
          })).data;
      } catch {
          return null; // No thumbnail if failed
      }
  }
    
      case "alluser": {
        if (!checkOwner(m, ptz)) return;
    
        try {
            const response = await axios.get(`${global.domain}/api/application/users`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${global.capiKey}`
                }
            });
    
            const users = response.data.data;
            if (users.length === 0) {
                return ptz.sendMessage(m.key.remoteJid, { text: "Tidak ada user yang ditemukan." }, { quoted: m });
            }
    
            let userList = "*📌 Daftar Pengguna:*";
            users.forEach((user, index) => {
                userList += `
    🔹 *${index + 1}. ${user.attributes.username}*
       ├ 🆔 ID: ${user.attributes.id}
       ├ 📧 Email: ${user.attributes.email}
       ├ 🔰 Admin: ${user.attributes.root_admin ? "✅" : "❌"}
       └ 📅 Dibuat: ${user.attributes.created_at}
    `;
            });
    
            ptz.sendMessage(m.key.remoteJid, { text: userList }, { quoted: m });
        } catch (error) {
            console.error("Error fetching users:", error.response?.data || error);
            ptz.sendMessage(m.key.remoteJid, { text: "Terjadi kesalahan saat mengambil daftar user." }, { quoted: m });
        }
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
  
      if (args.length < 2) {
          return ptz.sendMessage(m.key.remoteJid, { text: "Gunakan: .adduser <username> <password>" }, { quoted: m });
      }
  
      const username = args[0];
      const password = args[1];
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
  
          const userId = response.data.attributes.id; // Ambil ID user dari respons
          const updateUrl = `${global.domain}/api/application/users/${userId}`;
  
          await axios.patch(updateUrl, {
              email: email,
              username: username,
              first_name: username,
              last_name: "User",
              language: "en",
              password: password
          }, {
              headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${global.capiKey}`
              }
          });
  
          ptz.sendMessage(m.key.remoteJid, {
              text: `User berhasil dibuat dan password telah diatur!
              \n🔹 *Username:* ${username}
              📧 *Email:* ${email}
              🔑 *Password:* ${password}`
          }, { quoted: m });
      } catch (error) {
          console.error("Error creating/updating user:", error.response?.data || error);
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
