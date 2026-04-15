const express = require("express");
const https = require("https");
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

const DEVICES = [
  { id:"d1", name:"Heladera",     icon:"🧊", watts:150  },
  { id:"d2", name:"TV/Impresora", icon:"📺", watts:120  },
  { id:"d3", name:"Lavadora",     icon:"🫧", watts:1000 },
  { id:"d4", name:"Lavavajillas", icon:"🍽️", watts:800  },
];

let tapoToken = null;

async function post(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method:"POST",
      headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(data)}
    }, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function getToken() {
  if (tapoToken) return tapoToken;
  const r = await post("wap.tplinkcloud.com", "/", {
    method: "login",
    params: {
      appType: "Tapo_Android",
      cloudUserName: process.env.TAPO_EMAIL,
      cloudPassword: process.env.TAPO_PASSWORD,
      terminalUUID: "energyos-backend-001"
    }
  });
  if (r.error_code === 0) {
    tapoToken = r.result.token;
  }
  return tapoToken;
}

async function getDeviceList() {
  const token = await getToken();
  const r = await post("wap.tplinkcloud.com", `/?token=${token}`, {
    method: "getDeviceList"
  });
  return r.result?.deviceList || [];
}

app.get("/api/health", (req, res) => {
  res.json({ status:"ok", version:"1.0.0" });
});

app.get("/api/tapo-test", async (req, res) => {
  try {
    const token = await getToken();
    if (token) {
      const list = await getDeviceList();
      res.json({
        success: true,
        token: token.substring(0,10)+"...",
        deviceCount: list.length,
        devices: list.map(d => ({ alias: d.alias, status: d.status }))
      });
    } else {
      res.json({ success:false, error:"Login fallido — verifica email y contraseña en Environment" });
    }
  } catch(e) {
    res.json({ success:false, error: e.message });
  }
});

app.get("/api/devices", async (req, res) => {
  try {
    const list = await getDeviceList();
    const result = DEVICES.map(d => {
      const tapo = list.find(t => t.alias === d.name);
      return { ...d, online: !!tapo, on: tapo ? tapo.status === 1 : false };
    });
    res.json(result);
  } catch(e) {
    res.json(DEVICES.map(d => ({ ...d, online:false, on:false })));
  }
});

app.post("/api/devices/:id/toggle", async (req, res) => {
  const d = DEVICES.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error:"No encontrado" });
  res.json({ id:d.id, on:true, message:`${d.name} toggled` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("EnergyOS corriendo en puerto " + PORT);
});
