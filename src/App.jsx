import { useState, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(num) { return isNaN(num) ? "$—" : num.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function nv(v, fb = 0) { return parseFloat(v) || fb; }

function consumableCost(c, area) {
  if (!c) return 0;
  if (c.priceType === "bag") {
    const bagsNeeded = nv(c.bagCoverage) > 0 ? area / nv(c.bagCoverage) : 0;
    return bagsNeeded * nv(c.bagPrice);
  }
  if (c.priceType === "sqft") return area * nv(c.unitCost);
  if (c.priceType === "flat") return nv(c.unitCost);
  return 0;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_TILES = [
  { id: "ceramic",    name: "Ceramic",              icon: "⬜", labor: 6.0,  notes: "Standard install" },
  { id: "porcelain",  name: "Porcelain",             icon: "🔲", labor: 8.0,  notes: "Harder cut — slower install" },
  { id: "stone",      name: "Natural Stone",         icon: "🪨", labor: 12.0, notes: "Sealer required" },
  { id: "largformat", name: "Large Format (24x24+)", icon: "◼", labor: 14.0, notes: "Leveling clips required" },
  { id: "mosaic",     name: "Mosaic / Glass",        icon: "🔷", labor: 16.0, notes: "White thinset only" },
];

const SEED_CONSUMABLES = [
  { id: "thinset", name: "Thinset / Mortar", priceType: "bag",  bagPrice: 25, bagCoverage: 40, unitCost: "", note: "50 lb bag" },
  { id: "grout",   name: "Grout",            priceType: "bag",  bagPrice: 18, bagCoverage: 50, unitCost: "", note: "Varies by joint width" },
  { id: "membrane",name: "Waterproof Membrane", priceType: "sqft", bagPrice: "", bagCoverage: "", unitCost: 1.20, note: "$/sqft" },
  { id: "backer",  name: "Cement Backer Board", priceType: "sqft", bagPrice: "", bagCoverage: "", unitCost: 0.85, note: "$/sqft" },
  { id: "sealer",  name: "Stone / Grout Sealer", priceType: "sqft", bagPrice: "", bagCoverage: "", unitCost: 0.35, note: "$/sqft" },
  { id: "clips",   name: "Leveling Clips",    priceType: "sqft", bagPrice: "", bagCoverage: "", unitCost: 0.60, note: "$/sqft" },
];

const SEED_SERVICES = [
  { id: "waterproof", name: "Waterproof Membrane", laborPerSqFt: 1.0, consumableIds: ["membrane"] },
  { id: "backerboard",name: "Cement Backer Board", laborPerSqFt: 0.75, consumableIds: ["backer"] },
  { id: "levelclips", name: "Leveling Clip System", laborPerSqFt: 0.5, consumableIds: ["clips"] },
  { id: "stonesealer",name: "Stone / Grout Sealer", laborPerSqFt: 0.5, consumableIds: ["sealer"] },
];

const TILE_ICONS = ["⬜","🔲","🪨","◼","🔷","🟫","🟦","🟩","⬛","🔶","🔸","🔹"];

function newTile() { return { id: uid(), name: "", icon: "⬜", labor: "", notes: "" }; }
function newConsumable() { return { id: uid(), name: "", priceType: "bag", bagPrice: "", bagCoverage: "", unitCost: "", note: "" }; }
function newService() { return { id: uid(), name: "", laborPerSqFt: "", consumableIds: [] }; }

// ─── UI Components ────────────────────────────────────────────────────────────
const inputStyle = {
  background: "#1a1610", border: "1px solid #2e2518", borderRadius: 6,
  padding: "12px 16px", color: "#f0ede6", fontSize: 16,
  fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box", outline: "none",
};
const iStyle = {
  background: "#1a1610", border: "1px solid #2e2518", borderRadius: 4,
  padding: "7px 10px", color: "#f0ede6", fontSize: 13,
  fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box", outline: "none",
};
const delBtnStyle = {
  background: "transparent", border: "1px solid #3a1010", borderRadius: 4,
  color: "#804040", fontSize: 15, cursor: "pointer", padding: "4px 10px", flexShrink: 0,
};
const addBtnStyle = {
  width: "100%", padding: "12px", marginTop: 4,
  background: "transparent", border: "1px dashed #3a2e18",
  borderRadius: 8, cursor: "pointer", color: "#c19748",
  fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1,
};

function Field({ label, value, onChange, suffix, hint, type = "number" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {type === "text"
          ? <input value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle} />
          : <input type="number" value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle} />}
        {suffix && <span style={{ color: "#c19748", fontSize: 14, flexShrink: 0 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10, color: "#4a4030", marginTop: 4, fontFamily: "sans-serif" }}>{hint}</div>}
    </div>
  );
}

function StatBox({ label, value, highlight, color }) {
  return (
    <div style={{ background: "#0f0d0a", borderRadius: 8, padding: "16px 8px", border: "1px solid #2a2318" }}>
      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, color: color || (highlight ? "#c19748" : "#f0ede6"), fontWeight: 400 }}>{value}</div>
    </div>
  );
}

function LineItem({ label, value, indent, section, dim }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${section ? "14px 24px 14px" : indent ? "8px 7px 8px 36px" : "8px 24px"}`, borderBottom: "1px solid #1a1710", background: section ? "#161208" : "transparent" }}>
      <span style={{ fontSize: indent ? 12 : 13, color: dim ? "#3a3020" : indent ? "#6b5f4a" : "#8a7d65", fontFamily: "sans-serif", fontStyle: indent ? "italic" : "normal" }}>{label}</span>
      <span style={{ fontSize: indent ? 12 : 14, color: dim ? "#3a3020" : indent ? "#6b5f4a" : "#c8b98a", fontFamily: "sans-serif" }}>{dim && value === 0 ? "—" : fmt(value)}</span>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ settings, onSave }) {
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [tab, setTab] = useState("consumables");
  const [savedMsg, setSavedMsg] = useState(false);

  function setField(key, val) { setS(p => ({ ...p, [key]: val })); }

  // Tile CRUD
  function updateTile(id, field, val) { setS(p => ({ ...p, tiles: p.tiles.map(t => t.id === id ? { ...t, [field]: val } : t) })); }
  function addTile() { setS(p => ({ ...p, tiles: [...p.tiles, newTile()] })); }
  function deleteTile(id) { setS(p => ({ ...p, tiles: p.tiles.filter(t => t.id !== id) })); }

  // Consumable CRUD
  function updateCons(id, field, val) { setS(p => ({ ...p, consumables: p.consumables.map(c => c.id === id ? { ...c, [field]: val } : c) })); }
  function addCons() { setS(p => ({ ...p, consumables: [...p.consumables, newConsumable()] })); }
  function deleteCons(id) { setS(p => ({ ...p, consumables: p.consumables.filter(c => c.id !== id) })); }

  // Service CRUD
  function updateSvc(id, field, val) { setS(p => ({ ...p, services: p.services.map(sv => sv.id === id ? { ...sv, [field]: val } : sv) })); }
  function addSvc() { setS(p => ({ ...p, services: [...p.services, newService()] })); }
  function deleteSvc(id) { setS(p => ({ ...p, services: p.services.filter(sv => sv.id !== id) })); }
  function toggleSvcCons(svId, cId) {
    setS(p => ({ ...p, services: p.services.map(sv => {
      if (sv.id !== svId) return sv;
      const ids = sv.consumableIds.includes(cId) ? sv.consumableIds.filter(x => x !== cId) : [...sv.consumableIds, cId];
      return { ...sv, consumableIds: ids };
    })}));
  }

  function handleSave() {
    onSave(s);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  const tabStyle = (key) => ({
    padding: "8px 16px", border: "none", cursor: "pointer", fontFamily: "sans-serif",
    fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
    background: tab === key ? "#1e1a10" : "transparent",
    color: tab === key ? "#c19748" : "#5a4f38",
    borderBottom: tab === key ? "2px solid #c19748" : "2px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0d0b08", color: "#f0ede6" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 80px" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #1a1710" }}>
          <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Settings</div>
          <div style={{ display: "flex", gap: 0, marginTop: 16, overflowX: "auto" }}>
            {["consumables","tiles","services","general"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* CONSUMABLES TAB */}
          {tab === "consumables" && (
            <div>
              <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16 }}>
                All materials used across jobs. Each can be priced per bag, per sqft, or flat.
              </div>
              {s.consumables.map(c => (
                <div key={c.id} style={{ background: "#131008", border: "1px solid #2a2010", borderRadius: 8, padding: "14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>NAME</div>
                      <input value={c.name} onChange={e => updateCons(c.id, "name", e.target.value)} placeholder="Material name" style={iStyle} />
                    </div>
                    <button onClick={() => deleteCons(c.id)} style={{ ...delBtnStyle, alignSelf: "flex-end" }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["bag","sqft","flat"].map(pt => (
                      <button key={pt} onClick={() => updateCons(c.id, "priceType", pt)} style={{
                        padding: "5px 12px", border: "1px solid", borderRadius: 4, cursor: "pointer",
                        fontSize: 11, fontFamily: "sans-serif", fontWeight: 600,
                        borderColor: c.priceType === pt ? "#c19748" : "#2e2518",
                        background: c.priceType === pt ? "#1e1a10" : "transparent",
                        color: c.priceType === pt ? "#c19748" : "#5a4f38",
                      }}>{pt === "bag" ? "Per Bag" : pt === "sqft" ? "Per SqFt" : "Flat"}</button>
                    ))}
                  </div>
                  {c.priceType === "bag" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>BAG PRICE $</div>
                        <input type="number" value={c.bagPrice} onChange={e => updateCons(c.id, "bagPrice", e.target.value)} style={iStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>SQFT / BAG</div>
                        <input type="number" value={c.bagCoverage} onChange={e => updateCons(c.id, "bagCoverage", e.target.value)} style={iStyle} />
                      </div>
                    </div>
                  )}
                  {(c.priceType === "sqft" || c.priceType === "flat") && (
                    <div>
                      <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>{c.priceType === "sqft" ? "COST $/SQFT" : "FLAT COST $"}</div>
                      <input type="number" value={c.unitCost} onChange={e => updateCons(c.id, "unitCost", e.target.value)} style={iStyle} />
                    </div>
                  )}
                  {c.priceType === "bag" && c.bagPrice > 0 && c.bagCoverage > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#4a4030", fontFamily: "sans-serif" }}>
                      ${(nv(c.bagPrice)/nv(c.bagCoverage)).toFixed(3)}/sqft · 300 sqft job ≈ {fmt((nv(c.bagPrice)/nv(c.bagCoverage))*300)}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addCons} style={addBtnStyle}>+ ADD MATERIAL</button>
            </div>
          )}

          {/* TILES TAB */}
          {tab === "tiles" && (
            <div>
              <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16 }}>
                Tile types available in the estimator. Set your labor rate for each.
              </div>
              {s.tiles.map(t => (
                <div key={t.id} style={{ background: "#131008", border: "1px solid #2a2010", borderRadius: 8, padding: "14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <select value={t.icon} onChange={e => updateTile(t.id, "icon", e.target.value)} style={{ ...iStyle, width: 60, padding: "7px 4px", textAlign: "center", flexShrink: 0 }}>
                      {TILE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <input value={t.name} onChange={e => updateTile(t.id, "name", e.target.value)} placeholder="Tile name" style={{ ...iStyle, flex: 1 }} />
                    <button onClick={() => deleteTile(t.id)} style={{ ...delBtnStyle, alignSelf: "center" }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>LABOR $/SQFT</div>
                      <input type="number" value={t.labor} onChange={e => updateTile(t.id, "labor", e.target.value)} style={iStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>NOTES</div>
                      <input value={t.notes} onChange={e => updateTile(t.id, "notes", e.target.value)} placeholder="Optional" style={iStyle} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addTile} style={addBtnStyle}>+ ADD TILE TYPE</button>
            </div>
          )}

          {/* SERVICES TAB */}
          {tab === "services" && (
            <div>
              <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16 }}>
                Additional services with their linked materials and labor rates.
              </div>
              {s.services.map(sv => (
                <div key={sv.id} style={{ background: "#131008", border: "1px solid #2a2010", borderRadius: 8, padding: "14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input value={sv.name} onChange={e => updateSvc(sv.id, "name", e.target.value)} placeholder="Service name" style={{ ...iStyle, flex: 1 }} />
                    <button onClick={() => deleteSvc(sv.id)} style={{ ...delBtnStyle, alignSelf: "center" }}>✕</button>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>LABOR $/SQFT</div>
                    <input type="number" value={sv.laborPerSqFt} onChange={e => updateSvc(sv.id, "laborPerSqFt", e.target.value)} style={iStyle} />
                  </div>
                  <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8 }}>LINKED MATERIALS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {s.consumables.map(c => {
                      const linked = sv.consumableIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleSvcCons(sv.id, c.id)} style={{
                          padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11,
                          fontFamily: "sans-serif", border: "1px solid",
                          borderColor: linked ? "#c19748" : "#2e2518",
                          background: linked ? "#1e1a10" : "transparent",
                          color: linked ? "#c19748" : "#5a4f38",
                        }}>{c.name || "Unnamed"}</button>
                      );
                    })}
                    {s.consumables.length === 0 && <div style={{ fontSize: 11, color: "#3a3020", fontFamily: "sans-serif" }}>Add materials in the Consumables tab first</div>}
                  </div>
                </div>
              ))}
              <button onClick={addSvc} style={addBtnStyle}>+ ADD SERVICE</button>
            </div>
          )}

          {/* GENERAL TAB */}
          {tab === "general" && (
            <div>
              <Field label="Default Markup %" value={s.defaultMarkup} onChange={v => setField("defaultMarkup", v)} suffix="%" hint="Applied to every new estimate" />
              <Field label="Misc Supplies %" value={s.miscPercent} onChange={v => setField("miscPercent", v)} suffix="%" hint="% of labor cost added for misc supplies" />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 24px", background: "#0d0b08", borderTop: "1px solid #1a1710" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <button onClick={handleSave} style={{
              width: "100%", padding: "14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "#c19748", color: "#0d0b08", fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1,
            }}>
              {savedMsg ? "✓ SAVED" : "SAVE SETTINGS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Estimator ───────────────────────────────────────────────────────────
export default function TileEstimator() {
  const [page, setPage] = useState("estimate");
  const [settings, setSettings] = useState({
    miscPercent: 3, defaultMarkup: 40,
    consumables: SEED_CONSUMABLES,
    tiles: SEED_TILES,
    services: SEED_SERVICES,
  });

  const [sqft, setSqft]                     = useState("");
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [tilePriceSqFt, setTilePriceSqFt]   = useState("");
  const [wastePercent, setWastePercent]     = useState("10");
  const [serviceState, setServiceState]     = useState({});
  const [markupMode, setMarkupMode]         = useState("percent");
  const [markupPercent, setMarkupPercent]   = useState(40);
  const [manualPrice, setManualPrice]       = useState("");
  const [showBreakdown, setShowBreakdown]   = useState(false);
  const resultRef = useRef(null);

  function handleSaveSettings(s) {
    setSettings(s);
    setMarkupPercent(nv(s.defaultMarkup, 40));
    if (selectedTileId && !s.tiles.find(t => t.id === selectedTileId)) setSelectedTileId(null);
    setPage("estimate");
  }

  const tile        = settings.tiles.find(t => t.id === selectedTileId);
  const area        = nv(sqft);
  const laborRate   = nv(tile?.labor);
  const wastePct    = (parseFloat(wastePercent) || 0) / 100;
  const tileWithWaste   = area * (1 + wastePct);
  const tileCostPerSqFt = parseFloat(tilePriceSqFt) || 0;
  const tileCost    = tileWithWaste * tileCostPerSqFt;
  const laborCost   = area * laborRate;

  const thinsetC    = settings.consumables.find(c => c.id === "thinset");
  const groutC      = settings.consumables.find(c => c.id === "grout");
  const thinsetCost = thinsetC ? consumableCost(thinsetC, area) : 0;
  const groutCost   = groutC   ? consumableCost(groutC,   area) : 0;

  const enabledServices = settings.services.filter(sv => serviceState[sv.id]?.enabled);

  function getServiceCost(sv) {
    const svLabor = nv(sv.laborPerSqFt) * area;
    const matCost = sv.consumableIds.reduce((sum, cId) => {
      const c = settings.consumables.find(x => x.id === cId);
      if (!c) return sum;
      const override = serviceState[sv.id]?.overrides?.[cId];
      const effectiveC = override !== undefined ? { ...c, bagPrice: override, unitCost: override } : c;
      return sum + consumableCost(effectiveC, area);
    }, 0);
    return svLabor + matCost;
  }

  const servicesCost = enabledServices.reduce((sum, sv) => sum + getServiceCost(sv), 0);
  const miscSupplies = laborCost * (nv(settings.miscPercent) / 100);
  const trueCost     = tileCost + laborCost + thinsetCost + groutCost + servicesCost + miscSupplies;
  const customerPrice = markupMode === "percent" ? trueCost * (1 + nv(markupPercent) / 100) : nv(manualPrice);
  const profit = customerPrice - trueCost;
  const margin = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;
  const canCalculate = area > 0 && tile;

  function toggleService(id) {
    setServiceState(p => ({ ...p, [id]: { ...p[id], enabled: !p[id]?.enabled } }));
  }
  function setOverride(svId, cId, val) {
    setServiceState(p => ({ ...p, [svId]: { ...p[svId], overrides: { ...(p[svId]?.overrides || {}), [cId]: val } } }));
  }
  function getOverride(svId, cId, defaultVal) {
    const ov = serviceState[svId]?.overrides?.[cId];
    return ov !== undefined ? ov : defaultVal;
  }

  if (page === "settings") return <SettingsPage settings={settings} onSave={handleSaveSettings} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0b08", color: "#f0ede6" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 60px" }}>
        {/* Header */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #1a1710", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>TILE JOB</div>
            <div style={{ fontSize: 26, fontFamily: "Georgia, serif", fontWeight: 400, color: "#c19748", letterSpacing: 1 }}>Estimator</div>
          </div>
          <button onClick={() => setPage("settings")} style={{ background: "transparent", border: "1px solid #2e2518", borderRadius: 6, padding: "8px 14px", color: "#8a7d65", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" }}>⚙ Settings</button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Square footage */}
          <Field label="Square Footage" value={sqft} onChange={setSqft} suffix="sqft" />

          {/* Tile selection */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Tile Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
              {settings.tiles.map(t => (
                <button key={t.id} onClick={() => setSelectedTileId(t.id)} style={{
                  padding: "12px 8px", borderRadius: 8, border: "1px solid", cursor: "pointer", textAlign: "left",
                  borderColor: selectedTileId === t.id ? "#c19748" : "#2a2010",
                  background: selectedTileId === t.id ? "#1a1608" : "#131008",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, color: selectedTileId === t.id ? "#c19748" : "#8a7d65", fontFamily: "sans-serif", fontWeight: 600 }}>{t.name}</div>
                  {t.notes && <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", marginTop: 2 }}>{t.notes}</div>}
                  <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 4 }}>${nv(t.labor).toFixed(2)}/sqft labor</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tile cost + waste */}
          {selectedTileId && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Field label="Tile Cost $/sqft" value={tilePriceSqFt} onChange={setTilePriceSqFt} suffix="$" hint="What you pay per sqft" />
              <Field label="Waste %" value={wastePercent} onChange={setWastePercent} suffix="%" hint={area > 0 ? `Order ${(area*(1+(parseFloat(wastePercent)||0)/100)).toFixed(0)} sqft total` : "Extra tile to order"} />
            </div>
          )}

          {/* Additional Services */}
          {settings.services.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Additional Services</div>
              {settings.services.map(sv => {
                const enabled = !!serviceState[sv.id]?.enabled;
                return (
                  <div key={sv.id} style={{ marginBottom: 8, border: "1px solid", borderColor: enabled ? "#2a2010" : "#1a1610", borderRadius: 8, overflow: "hidden" }}>
                    <button onClick={() => toggleService(sv.id)} style={{
                      width: "100%", padding: "12px 16px", background: enabled ? "#131008" : "#0f0d0a",
                      border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 13, color: enabled ? "#c19748" : "#5a4f38", fontFamily: "sans-serif" }}>{sv.name || "Unnamed Service"}</span>
                      <span style={{ fontSize: 11, color: enabled ? "#c19748" : "#3a3020", fontFamily: "sans-serif" }}>
                        {enabled ? "✓ INCLUDED" : area > 0 ? `≈ ${fmt(getServiceCost(sv))}` : "tap to add"}
                      </span>
                    </button>
                    {enabled && sv.consumableIds.length > 0 && (
                      <div style={{ padding: "10px 16px", background: "#0f0d0a", borderTop: "1px solid #1a1610" }}>
                        <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", marginBottom: 8 }}>OVERRIDE MATERIAL COSTS FOR THIS JOB</div>
                        {sv.consumableIds.map(cId => {
                          const c = settings.consumables.find(x => x.id === cId);
                          if (!c) return null;
                          const defaultVal = c.priceType === "bag" ? c.bagPrice : c.unitCost;
                          return (
                            <div key={cId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, color: "#6b5f4a", fontFamily: "sans-serif", flex: 1 }}>{c.name}</span>
                              <input type="number" value={getOverride(sv.id, cId, defaultVal)} onChange={e => setOverride(sv.id, cId, e.target.value)}
                                style={{ ...iStyle, width: 80 }} />
                              <span style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", width: 50 }}>{c.priceType === "bag" ? "$/bag" : c.priceType === "sqft" ? "$/sqft" : "flat"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Markup */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Customer Pricing</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["percent","manual"].map(m => (
                <button key={m} onClick={() => setMarkupMode(m)} style={{
                  flex: 1, padding: "10px", border: "1px solid", borderRadius: 6, cursor: "pointer",
                  borderColor: markupMode === m ? "#c19748" : "#2e2518",
                  background: markupMode === m ? "#1e1a10" : "transparent",
                  color: markupMode === m ? "#c19748" : "#5a4f38",
                  fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
                }}>{m === "percent" ? "% Markup" : "Set Price"}</button>
              ))}
            </div>
            {markupMode === "percent"
              ? <Field label="Markup %" value={markupPercent} onChange={setMarkupPercent} suffix="%" />
              : <Field label="Customer Price" value={manualPrice} onChange={setManualPrice} suffix="$" />
            }
          </div>

          {/* Calculate button */}
          <button
            onClick={() => { setShowBreakdown(true); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
            disabled={!canCalculate}
            style={{
              width: "100%", padding: "16px", borderRadius: 8, border: "none", cursor: canCalculate ? "pointer" : "not-allowed",
              background: canCalculate ? "#c19748" : "#1e1a10",
              color: canCalculate ? "#0d0b08" : "#3a3020",
              fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 2, marginBottom: 32,
            }}>CALCULATE ESTIMATE</button>

          {/* Results */}
          {showBreakdown && canCalculate && (
            <div ref={resultRef} style={{ border: "1px solid #2a2010", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "20px 24px", background: "#131008", borderBottom: "1px solid #1a1710" }}>
                <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Estimate Summary</div>
                <div style={{ fontSize: 13, color: "#6b5f4a", fontFamily: "sans-serif" }}>{tile?.name} · {area} sqft</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#1a1710" }}>
                <div style={{ background: "#0d0b08", padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>True Cost</div>
                  <div style={{ fontSize: 18, color: "#f0ede6" }}>{fmt(trueCost)}</div>
                </div>
                <div style={{ background: "#0d0b08", padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Customer Price</div>
                  <div style={{ fontSize: 18, color: "#c19748" }}>{fmt(customerPrice)}</div>
                </div>
                <div style={{ background: "#0d0b08", padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Profit</div>
                  <div style={{ fontSize: 18, color: profit >= 0 ? "#6dc47a" : "#e05c5c" }}>{fmt(profit)}</div>
                </div>
              </div>

              {/* Breakdown */}
              <LineItem label="Tile Materials" value={tileCost} section />
              <LineItem label={`${tileWithWaste.toFixed(0)} sqft × $${tileCostPerSqFt.toFixed(2)}/sqft`} value={tileCost} indent dim={tileCost === 0} />
              <LineItem label="Labor" value={laborCost} section />
              <LineItem label={`${area} sqft × $${nv(tile?.labor).toFixed(2)}/sqft`} value={laborCost} indent dim={laborCost === 0} />
              <LineItem label="Thinset" value={thinsetCost} section />
              <LineItem label="Grout" value={groutCost} section />
              {enabledServices.map(sv => (
                <LineItem key={sv.id} label={sv.name} value={getServiceCost(sv)} section />
              ))}
              <LineItem label={`Misc Supplies (${settings.miscPercent}%)`} value={miscSupplies} section />

              <div style={{ padding: "14px 24px", background: "#161208", borderTop: "1px solid #2a2010", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#8a7d65", fontFamily: "sans-serif" }}>Margin</span>
                <span style={{ fontSize: 13, color: margin >= 20 ? "#6dc47a" : margin >= 10 ? "#e8c870" : "#e05c5c", fontFamily: "sans-serif" }}>{margin.toFixed(1)}%</span>
              </div>

              {profit < 0 && (
                <div style={{ margin: "0 24px 20px", background: "#2a1010", border: "1px solid #6b1010", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#e05c5c", fontFamily: "sans-serif" }}>
                  ⚠ Customer price is below your true cost — you're losing {fmt(Math.abs(profit))} on this job.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
