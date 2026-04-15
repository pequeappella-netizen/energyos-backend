const express = require("express");
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

const TAPO_EMAIL = process.env.TAPO_EMAIL || "";
const TAPO_PASSWORD = process.env.TAPO_PASSWORD || "";

const DEVICES = [
  { id:"d1", name:"Heladera",     icon:"🧊", ip:"192.168.192.2" },
  { id:"d2", name:"TV/Impresora", icon:"📺", ip:"192.168.192.3" },
  { id:"d3", name:"Lavadora",     icon:"🫧", ip:"192.168.192.4" },
  { id:"d4", name:"Lavavajillas", icon:"🍽️", ip:"192.168.192.5" },
];

app.get("/api/health", (req, res) => {
  res.json({ status:"ok", version:"1.0.0" });
});

app.get("/api/devices", (req, res) => {
  res.json(DEVICES.map(d => ({ ...d, online:true, on:false, watts:0 })));
});

app.post("/api/devices/:id/toggle", (req, res) => {
  const d = DEVICES.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error:"No encontrado" });
  res.json({ id:d.id, on:true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("EnergyOS corriendo en puerto " + PORT);
});
