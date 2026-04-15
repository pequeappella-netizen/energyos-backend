const express = require("express");
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

app.get("/api/health", (req, res) => {
  res.json({ status:"ok", version:"1.0.0" });
});

app.get("/api/devices", (req, res) => {
  res.json(DEVICES.map(d => ({ ...d, on:false, watts:0 })));
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
