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
  { id:"d1", name:"Heladera",      icon:"🧊", watts:150  },
  { id:"d2", name:"TV /Impresora", icon:"📺", watts:120  },
  { id:"d3", name:"Lavadora",      icon:"🫧", watts:1000 },
  { id:"d4", name:"Lavavajillas",  icon:"🍽️", watts:800  },
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
  if (r.error_code === 0) tapoToken = r.result.token;
  return tapoToken;
}

async function getDeviceList() {
  const token = await getToken();
  const r = await post("wap.tplinkcloud.com", `/?token=${token}`, {
    method: "getDeviceList"
  });
  return r.result?.deviceList || [];
}

function decode(alias) {
  try { return Buffer.from(alias || "", "base64").toString("utf8").trim(); }
  catch(e) { return (alias || "").trim(); }
}

app.get("/api/health", (req, res) => {
  res.json({ status:"ok", version:"1.0.0" });
});

app.get("/api/devices", async (req, res) => {
  try {
    const list = await getDeviceList();
    const result = DEVICES.map(d => {
      const tapo = list.find(t => decode(t.alias) === d.name);
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
  try {
    const token = await getToken();
    const list = await getDeviceList();
    const tapo = list.find(t => decode(t.alias) === d.name);
    if (!tapo) return res.status(503).json({ error:"Dispositivo offline" });
    const newState = tapo.status !== 1;
    await post("wap.tplinkcloud.com", `/?token=${token}`, {
      method: "passthrough",
      params: {
        deviceId: tapo.deviceId,
        requestData: JSON.stringify({
          method: "set_device_info",
          params: { device_on: newState }
        })
      }
    });
    res.json({ id:d.id, on:newState });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/devices/eco", async (req, res) => {
  try {
    const token = await getToken();
    const list = await getDeviceList();
    await Promise.all(DEVICES.map(async d => {
      const tapo = list.find(t => decode(t.alias) === d.name);
      if (!tapo) return;
      const keepOn = d.id === "d1";
      await post("wap.tplinkcloud.com", `/?token=${token}`, {
        method: "passthrough",
        params: {
          deviceId: tapo.deviceId,
          requestData: JSON.stringify({
            method: "set_device_info",
            params: { device_on: keepOn }
          })
        }
      });
    }));
    res.json({ message:"Modo ahorro activado" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("EnergyOS corriendo en puerto " + PORT);
});
