import { useState, useRef } from "react";

// ─── Custom Checkbox ──────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, onClick }) {
  return (
    <div
      onClick={onClick}
      onChange={onChange}
      style={{
        width: 18, height: 18, flexShrink: 0, cursor: "pointer",
        borderRadius: 4,
        border: checked ? "2px solid #c19748" : "2px solid #3a3020",
        background: checked ? "#c19748" : "#1a1610",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
        boxSizing: "border-box",
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#0f0d0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_TILES = [
  { id: "ceramic",    name: "Ceramic",              icon: "⬜", labor: 6.0,  notes: "Standard install" },
  { id: "porcelain",  name: "Porcelain",             icon: "🔲", labor: 8.0,  notes: "Harder cut — slower install" },
  { id: "stone",      name: "Natural Stone",         icon: "🪨", labor: 12.0, notes: "Sealer required" },
  { id: "largformat", name: "Large Format (24x24+)", icon: "◼", labor: 14.0, notes: "Leveling clips required" },
  { id: "mosaic",     name: "Mosaic / Glass",        icon: "🔷", labor: 16.0, notes: "White thinset only" },
];

// Master consumables list — all materials live here
// priceType: "bag" (bag price + coverage), "sqft" ($/sqft), "flat" ($/unit)
const SEED_CONSUMABLES = [
  { id: "thinset",    name: "Thinset / Mortar",        priceType: "bag",  bagPrice: 25, bagCoverage: 40, unitCost: "",  note: "50 lb bag" },
  { id: "grout",      name: "Grout",                   priceType: "bag",  bagPrice: 18, bagCoverage: 50, unitCost: "",  note: "Varies by joint width" },
  { id: "backer",     name: "Cement Backer Board",     priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.65, note: "" },
  { id: "membrane",   name: "Waterproof Membrane",     priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.90, note: "" },
  { id: "memtape",    name: "Membrane Seam Tape",      priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 18,   note: "Per roll" },
  { id: "levelclips", name: "Leveling Clips",          priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.45, note: "" },
  { id: "wedges",     name: "Leveling Wedges",         priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 22,   note: "Per bag" },
  { id: "sealer",     name: "Stone / Grout Sealer",    priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 35,   note: "Per bottle" },
  { id: "primer",     name: "Subfloor Primer",         priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 35,   note: "Per bucket" },
  { id: "selfLevel",  name: "Self-Leveling Compound",  priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.60, note: "" },
  { id: "backscrews", name: "Backer Board Screws",     priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 8,    note: "Per box" },
  { id: "meshtape",   name: "Fiberglass Mesh Tape",    priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 12,   note: "Per roll" },
];

// Services: each has a name, labor rate ($/sqft), and list of consumable IDs assigned to it
const SEED_SERVICES = [
  { id: "backer_svc",  name: "Cement Backer Board",  laborPerSqFt: 0.50, consumableIds: ["backer", "backscrews", "meshtape"] },
  { id: "membrane_svc",name: "Waterproof Membrane",  laborPerSqFt: 0.75, consumableIds: ["membrane", "memtape"] },
  { id: "levelclip_svc",name:"Leveling Clips System",laborPerSqFt: 0.40, consumableIds: ["levelclips", "wedges"] },
  { id: "demo_svc",    name: "Demo / Removal",        laborPerSqFt: 1.50, consumableIds: [] },
  { id: "subfloor_svc",name: "Subfloor Prep",         laborPerSqFt: 0.80, consumableIds: ["selfLevel", "primer"] },
  { id: "sealer_svc",  name: "Stone / Grout Sealer",  laborPerSqFt: 0.25, consumableIds: ["sealer"] },
];

const TILE_ICONS = ["⬜","🔲","🪨","◼","🔷","🟫","🟦","🟩","⬛","🔶","🔸","🔹"];
const PRICE_TYPES = ["bag", "sqft", "flat"];
const PRICE_TYPE_LABELS = { bag: "Bag (price + coverage)", sqft: "Per Sqft ($/sqft)", flat: "Flat ($/unit)" };

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(n) { return (isNaN(n) || n == null) ? "$—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function nv(v, fb = 0) { return parseFloat(v) || fb; }

function newTile()        { return { id: uid(), name: "", icon: "⬜", labor: "", notes: "" }; }
function newConsumable()  { return { id: uid(), name: "", priceType: "sqft", bagPrice: "", bagCoverage: "", unitCost: "", note: "" }; }
function newService()     { return { id: uid(), name: "", laborPerSqFt: "", consumableIds: [] }; }

// Cost of a consumable for a given sqft area
function consumableCost(c, area) {
  if (!c) return 0;
  if (c.priceType === "bag") {
    const coverage = nv(c.bagCoverage, 1);
    return (area / coverage) * nv(c.bagPrice);
  }
  if (c.priceType === "sqft") return area * nv(c.unitCost);
  if (c.priceType === "flat") return nv(c.unitCost);
  return 0;
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ settings, onSave }) {
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [tab, setTab] = useState("contractor");

  function setField(k, v) { setS(p => ({ ...p, [k]: v })); }

  // Consumables CRUD
  function updateC(id, field, val) {
    setS(p => ({ ...p, consumables: p.consumables.map(c => c.id === id ? { ...c, [field]: val } : c) }));
  }
  function addC()       { setS(p => ({ ...p, consumables: [...p.consumables, newConsumable()] })); }
  function deleteC(id)  { setS(p => ({ ...p, consumables: p.consumables.filter(c => c.id !== id) })); }

  // Tiles CRUD
  function updateT(id, field, val) {
    setS(p => ({ ...p, tiles: p.tiles.map(t => t.id === id ? { ...t, [field]: val } : t) }));
  }
  function addT()       { setS(p => ({ ...p, tiles: [...p.tiles, newTile()] })); }
  function deleteT(id)  { setS(p => ({ ...p, tiles: p.tiles.filter(t => t.id !== id) })); }

  // Services CRUD
  function updateSv(id, field, val) {
    setS(p => ({ ...p, services: p.services.map(sv => sv.id === id ? { ...sv, [field]: val } : sv) }));
  }
  function addSv()      { setS(p => ({ ...p, services: [...p.services, newService()] })); }
  function deleteSv(id) { setS(p => ({ ...p, services: p.services.filter(sv => sv.id !== id) })); }
  function toggleConsumableOnService(svId, cId) {
    setS(p => ({ ...p, services: p.services.map(sv => {
      if (sv.id !== svId) return sv;
      const has = sv.consumableIds.includes(cId);
      return { ...sv, consumableIds: has ? sv.consumableIds.filter(x => x !== cId) : [...sv.consumableIds, cId] };
    })}));
  }

  const subTab = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: "8px 14px", border: "none", cursor: "pointer", fontFamily: "sans-serif",
      fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
      background: "transparent",
      color: tab === key ? "#c19748" : "#5a4f38",
      borderBottom: tab === key ? "2px solid #c19748" : "2px solid transparent",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #2e2518", marginBottom: 28, overflowX: "auto" }}>
        {subTab("contractor",  "Contractor Info")}
        {subTab("consumables", "Consumables & Rates")}
        {subTab("tiles",       "Tile Types")}
        {subTab("services",    "Services")}
      </div>

      {/* ── Contractor Info ── */}
      {tab === "contractor" && (
        <div>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 20, fontStyle: "italic" }}>
            This info appears on every estimate you send to customers.
          </div>

          {/* Company & Contact */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Business Info</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Company Name", key: "companyName", placeholder: "Precision Tile Co." },
                { label: "Contact Name", key: "contactName", placeholder: "Mike Johnson" },
                { label: "Phone", key: "phone", placeholder: "(555) 867-5309" },
                { label: "Email", key: "email", placeholder: "mike@precisiontile.com" },
                { label: "Website (optional)", key: "website", placeholder: "www.precisiontile.com" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <input
                    value={s.contractor?.[key] || ""}
                    placeholder={placeholder}
                    onChange={e => setS(p => ({ ...p, contractor: { ...p.contractor, [key]: e.target.value } }))}
                    style={iStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Estimate Number */}
          <div style={{ marginBottom: 20, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Estimate Numbering</div>
            <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Next Estimate Number</div>
            <input
              type="number"
              value={s.estimateNumber || 1}
              onChange={e => setS(p => ({ ...p, estimateNumber: parseInt(e.target.value) || 1 }))}
              style={{ ...iStyle, width: 100 }}
            />
            <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 6, fontStyle: "italic" }}>
              Auto-increments each time you send an estimate.
            </div>
          </div>

          {/* Default Terms */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Default Terms</div>
            <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8, fontStyle: "italic" }}>
              These terms appear on every estimate. You can edit them before sending.
            </div>
            <textarea
              value={s.defaultTerms || ""}
              onChange={e => setS(p => ({ ...p, defaultTerms: e.target.value }))}
              rows={6}
              style={{ ...iStyle, resize: "vertical", lineHeight: 1.7, fontSize: 13 }}
            />
          </div>
        </div>
      )}

      {/* ── Consumables & Rates ── */}
      {tab === "consumables" && (
        <>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16, fontStyle: "italic" }}>
            All materials used across your jobs. Services pull from this list. Thinset and grout use bag pricing; others can be per sqft or flat.
          </div>

          {s.consumables.map(c => (
            <div key={c.id} style={{ marginBottom: 10, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, padding: "12px 14px" }}>
              {/* Row 1: Name + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    placeholder="Material name"
                    value={c.name}
                    onChange={e => updateC(c.id, "name", e.target.value)}
                    style={{ ...iStyle, fontSize: 14, fontWeight: 600, color: "#d4c49a" }}
                  />
                </div>
                <button onClick={() => deleteC(c.id)} style={delBtnStyle}>✕</button>
              </div>
              {/* Row 2: Price type + cost + coverage */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 8, alignItems: "start" }}>
                {/* Price type */}
                <div>
                  <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Price Type</div>
                  <select value={c.priceType} onChange={e => updateC(c.id, "priceType", e.target.value)}
                    style={{ ...iStyle, cursor: "pointer", fontSize: 12 }}>
                    {PRICE_TYPES.map(pt => <option key={pt} value={pt}>{pt === "bag" ? "Bag" : pt === "sqft" ? "Per Sqft" : "Flat"}</option>)}
                  </select>
                </div>
                {/* Cost */}
                <div>
                  <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {c.priceType === "bag" ? "Bag Price" : "Unit Cost"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ color: "#5a4f38", fontSize: 12, flexShrink: 0 }}>$</span>
                    <input type="number" placeholder="0.00"
                      value={c.priceType === "bag" ? c.bagPrice : c.unitCost}
                      onChange={e => updateC(c.id, c.priceType === "bag" ? "bagPrice" : "unitCost", e.target.value)}
                      style={{ ...iStyle, flex: 1 }} />
                  </div>
                </div>
                {/* Coverage or unit label */}
                {c.priceType === "bag" ? (
                  <div>
                    <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Coverage</div>
                    <input type="number" placeholder="sqft/bag"
                      value={c.bagCoverage}
                      onChange={e => updateC(c.id, "bagCoverage", e.target.value)}
                      style={iStyle} />
                    <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", marginTop: 3 }}>sqft per bag</div>
                  </div>
                ) : (
                  <div style={{ paddingTop: 22 }}>
                    <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", fontStyle: "italic" }}>
                      {c.priceType === "sqft" ? "charged per sqft" : "flat per job"}
                    </div>
                  </div>
                )}
              </div>
              {/* Row 3: Note */}
              {c.note !== undefined && (
                <div style={{ marginTop: 8 }}>
                  <input placeholder="Note (optional)" value={c.note} onChange={e => updateC(c.id, "note", e.target.value)}
                    style={{ ...iStyle, fontSize: 11, color: "#8a7d65" }} />
                </div>
              )}
            </div>
          ))}
          <button onClick={addC} style={addBtnStyle}>+ Add Material</button>

          <div style={{ marginTop: 28 }}>
            <SettSection title="Misc & Markup Defaults">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SField label="Misc Supplies %" value={s.miscPercent}   onChange={v => setField("miscPercent", v)}   hint="% of labor cost (blades, spacers…)" suffix="%" />
                <SField label="Default Markup %" value={s.defaultMarkup} onChange={v => setField("defaultMarkup", v)} hint="Pre-filled on every new estimate"    suffix="%" />
              </div>
            </SettSection>
          </div>
        </>
      )}

      {/* ── Tile Types ── */}
      {tab === "tiles" && (
        <>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16, fontStyle: "italic" }}>
            Tile types set the labor rate only. Tile material cost and waste % are entered per job on the estimator.
          </div>
          {s.tiles.map(t => (
            <div key={t.id} style={{ marginBottom: 12, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <select value={t.icon} onChange={e => updateT(t.id, "icon", e.target.value)}
                  style={{ background: "#1a1610", border: "1px solid #2e2518", borderRadius: 4, color: "#f0ede6", fontSize: 18, padding: "4px 6px", cursor: "pointer", outline: "none" }}>
                  {TILE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input placeholder="Tile name" value={t.name} onChange={e => updateT(t.id, "name", e.target.value)}
                  style={{ ...iStyle, flex: 1, fontSize: 14, fontWeight: 700 }} />
                <button onClick={() => deleteT(t.id)} style={delBtnStyle}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <SField label="Labor $/sqft" value={t.labor} onChange={v => updateT(t.id, "labor", v)} hint="Install labor rate" />
                <SField label="Note (optional)" value={t.notes} onChange={v => updateT(t.id, "notes", v)} hint="Shown on estimator" isText />
              </div>
            </div>
          ))}
          <button onClick={addT} style={addBtnStyle}>+ Add Tile Type</button>
        </>
      )}

      {/* ── Services ── */}
      {tab === "services" && (
        <>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16, fontStyle: "italic" }}>
            Each service has a labor rate and a list of materials pulled from your Consumables list.
          </div>
          {s.services.map(sv => (
            <div key={sv.id} style={{ marginBottom: 16, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#13110d", borderBottom: "1px solid #2e2518" }}>
                <input placeholder="Service name" value={sv.name} onChange={e => updateSv(sv.id, "name", e.target.value)}
                  style={{ ...iStyle, flex: 1, fontSize: 14, fontWeight: 700, color: "#c19748" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>Labor $/sqft</span>
                  <input type="number" placeholder="0.00" value={sv.laborPerSqFt}
                    onChange={e => updateSv(sv.id, "laborPerSqFt", e.target.value)}
                    style={{ ...iStyle, width: 70 }} />
                </div>
                <button onClick={() => deleteSv(sv.id)} style={delBtnStyle}>✕</button>
              </div>
              {/* Consumables assignment */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  Assigned Materials
                </div>
                {s.consumables.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", fontStyle: "italic" }}>
                    Add materials in Consumables & Rates first
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {s.consumables.map(c => {
                      const assigned = sv.consumableIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleConsumableOnService(sv.id, c.id)} style={{
                          padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "sans-serif", fontSize: 12,
                          border: `1px solid ${assigned ? "#c19748" : "#2e2518"}`,
                          background: assigned ? "#c19748" : "#1a1610",
                          color: assigned ? "#0f0f0f" : "#8a7d65",
                          transition: "all 0.15s",
                        }}>
                          {assigned ? "✓ " : ""}{c.name || "Unnamed"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          <button onClick={addSv} style={addBtnStyle}>+ Add Service</button>
        </>
      )}

      <div style={{ marginTop: 32 }}>
        <button onClick={() => onSave(s)} style={{
          width: "100%", padding: "16px",
          background: "linear-gradient(135deg, #c19748, #a07830)",
          border: "none", borderRadius: 8, cursor: "pointer",
          color: "#0f0f0f", fontSize: 15, fontWeight: 700,
          letterSpacing: 2, textTransform: "uppercase", fontFamily: "sans-serif",
          boxShadow: "0 4px 24px rgba(193,151,72,0.3)",
        }}>Save Settings</button>
      </div>
    </div>
  );
}

// ─── Settings helpers ─────────────────────────────────────────────────────────
function SettSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 15, color: "#d4c49a" }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #2e2518, transparent)" }} />
      </div>
      {children}
    </div>
  );
}
function SField({ label, value, onChange, hint, suffix, isText }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isText
          ? <input value={value || ""} onChange={e => onChange(e.target.value)} style={iStyle} />
          : <input type="number" value={value || ""} onChange={e => onChange(e.target.value)} style={iStyle} />
        }
        {suffix && <span style={{ color: "#c19748", fontSize: 14, flexShrink: 0 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10, color: "#4a4030", marginTop: 4, fontFamily: "sans-serif" }}>{hint}</div>}
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
    contractor: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
    },
    estimateNumber: 1,
    defaultTerms: "50% deposit required to schedule.\nRemaining balance due upon completion.\nThis estimate is valid for 30 days.\nAny additional work outside this scope will be quoted separately.",
  });
  const [savedMsg, setSavedMsg] = useState(false);

  const [sqft, setSqft]                     = useState("");
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [tilePriceSqFt, setTilePriceSqFt]   = useState("");
  const [wastePercent, setWastePercent]     = useState("10");
  // serviceState: { [serviceId]: { enabled, overrides: { [consumableId]: costOverride } } }
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
    setSavedMsg(true);
    setTimeout(() => { setSavedMsg(false); setPage("estimate"); }, 1200);
  }

  const tile         = settings.tiles.find(t => t.id === selectedTileId);
  const area         = nv(sqft);
  const laborRate    = nv(tile?.labor);
  const wastePct     = (parseFloat(wastePercent) || 0) / 100;
  const tileWithWaste    = area * (1 + wastePct);
  const tileCostPerSqFt  = parseFloat(tilePriceSqFt) || 0;
  const tileCost     = tileWithWaste * tileCostPerSqFt;
  const laborCost    = area * laborRate;

  // Thinset & grout come from consumables list
  const thinsetC  = settings.consumables.find(c => c.id === "thinset");
  const groutC    = settings.consumables.find(c => c.id === "grout");
  const thinsetCost = thinsetC ? consumableCost(thinsetC, area) : 0;
  const groutCost   = groutC   ? consumableCost(groutC,   area) : 0;

  // Enabled services
  const enabledServices = settings.services.filter(sv => serviceState[sv.id]?.enabled);

  function getServiceCost(sv) {
    const laborCostSv = nv(sv.laborPerSqFt) * area;
    const matCost = sv.consumableIds.reduce((sum, cId) => {
      const c = settings.consumables.find(x => x.id === cId);
      if (!c) return sum;
      const override = serviceState[sv.id]?.overrides?.[cId];
      const effectiveC = override !== undefined ? { ...c, bagPrice: override, unitCost: override } : c;
      return sum + consumableCost(effectiveC, area);
    }, 0);
    return laborCostSv + matCost;
  }

  const servicesCost = enabledServices.reduce((sum, sv) => sum + getServiceCost(sv), 0);
  const miscSupplies = laborCost * (nv(settings.miscPercent) / 100);
  const trueCost     = tileCost + laborCost + thinsetCost + groutCost + servicesCost + miscSupplies;

  const customerPrice = markupMode === "percent"
    ? trueCost * (1 + nv(markupPercent) / 100)
    : nv(manualPrice);
  const profit = customerPrice - trueCost;
  const margin = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;
  const canCalculate = area > 0 && tile;

  function toggleService(id) {
    setServiceState(p => ({ ...p, [id]: { ...p[id], enabled: !p[id]?.enabled } }));
  }
  function setOverride(svId, cId, val) {
    setServiceState(p => ({
      ...p, [svId]: { ...p[svId], overrides: { ...(p[svId]?.overrides || {}), [cId]: val } }
    }));
  }
  function getOverride(svId, cId, defaultVal) {
    const ov = serviceState[svId]?.overrides?.[cId];
    return ov !== undefined ? ov : String(defaultVal);
  }

  function handleCalculate() {
    setShowBreakdown(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  function resetEstimate() {
    setSqft(""); setSelectedTileId(null); setTilePriceSqFt(""); setWastePercent("10");
    setServiceState({}); setMarkupPercent(nv(settings.defaultMarkup, 40));
    setManualPrice(""); setShowBreakdown(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#f0ede6", fontFamily: "'Georgia','Times New Roman',serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1208,#0f0f0f)", borderBottom: "1px solid #3a2e1a", padding: "28px 32px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(193,151,72,0.03) 20px,rgba(193,151,72,0.03) 21px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#c19748", textTransform: "uppercase" }}>Professional Estimating Tool</div>
            <div style={{ fontSize: 10, color: "#3a3020", fontFamily: "sans-serif", letterSpacing: 1 }}>v0.2.6</div>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,36px)", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.1 }}>
            Tile Job <span style={{ color: "#c19748", fontStyle: "italic" }}>Cost Estimator</span>
          </h1>
          <div style={{ display: "flex", gap: 0, marginTop: 18, alignItems: "center" }}>
            {[["estimate","Estimator"],["settings","⚙ Settings"],["help","? Help"]].map(([key, label]) => (
              <button key={key} onClick={() => setPage(key)} style={{
                padding: "10px 22px", border: "none", cursor: "pointer", fontFamily: "sans-serif",
                fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", background: "transparent",
                color: page === key ? "#c19748" : "#5a4f38",
                borderBottom: page === key ? "2px solid #c19748" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{label}</button>
            ))}
            {savedMsg && <div style={{ marginLeft: "auto", fontSize: 12, color: "#6dc47a", fontFamily: "sans-serif", paddingRight: 4 }}>✓ Settings saved</div>}
          </div>
        </div>
      </div>

      {page === "settings" ? <SettingsPage settings={settings} onSave={handleSaveSettings} />
      : page === "help"     ? <HelpPage />
      : (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* 01 */}
          <Section label="01" title="Square Footage">
            <input type="number" placeholder="e.g. 350" value={sqft} onChange={e => setSqft(e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b5f4a", marginTop: 8 }}>Enter the total area in square feet</div>
          </Section>

          {/* 02 */}
          <Section label="02" title="Tile Type">
            {settings.tiles.length === 0 ? <EmptyState msg="No tile types yet — add some in ⚙ Settings → Tile Types" /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10 }}>
                {settings.tiles.map(t => (
                  <button key={t.id} onClick={() => setSelectedTileId(t.id)} style={{
                    background: selectedTileId === t.id ? "#c19748" : "#1c1812",
                    border: `1px solid ${selectedTileId === t.id ? "#c19748" : "#2e2518"}`,
                    borderRadius: 6, padding: "14px 10px", cursor: "pointer",
                    color: selectedTileId === t.id ? "#0f0f0f" : "#c8b98a",
                    textAlign: "center", transition: "all 0.18s",
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "sans-serif" }}>{t.name || "Unnamed"}</div>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75, fontFamily: "sans-serif" }}>Labor: ${nv(t.labor)}/sqft</div>
                  </button>
                ))}
              </div>
            )}
            {tile && (
              <>
                <div style={{ marginTop: 12, background: "#161208", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 16px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                  <InfoPill label="Labor Rate"    value={`$${nv(tile.labor)}/sqft`} />
                  <InfoPill label="Sqft to Order" value={area > 0 ? `${tileWithWaste.toFixed(0)} sqft` : "—"} gold />
                  {tile.notes && <div style={{ fontSize: 11, color: "#5a4f38", fontStyle: "italic", fontFamily: "sans-serif", marginLeft: "auto" }}>{tile.notes}</div>}
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#161208", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tile Cost $/sqft</div>
                    <input type="number" placeholder="0.00" value={tilePriceSqFt} onChange={e => setTilePriceSqFt(e.target.value)} style={inputStyle} min="0" />
                    <div style={{ fontSize: 10, color: "#4a4030", marginTop: 5, fontFamily: "sans-serif" }}>Enter 0 or leave blank if not yet purchased</div>
                  </div>
                  <div style={{ background: "#161208", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Waste %</div>
                    <input type="number" placeholder="10" value={wastePercent} onChange={e => setWastePercent(e.target.value)} style={inputStyle} min="0" />
                    <div style={{ fontSize: 10, color: "#4a4030", marginTop: 5, fontFamily: "sans-serif" }}>
                      {area > 0 ? `Order ${tileWithWaste.toFixed(0)} sqft (${area} + ${(tileWithWaste - area).toFixed(0)} waste)` : "Sqft to order shown once area is entered"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* 03 */}
          <Section label="03" title="Additional Services">
            {settings.services.length === 0 ? <EmptyState msg="No services yet — add some in ⚙ Settings → Services" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {settings.services.map(sv => {
                  const isOn   = !!serviceState[sv.id]?.enabled;
                  const svCost = getServiceCost(sv);
                  const assignedConsumables = sv.consumableIds.map(cId => settings.consumables.find(c => c.id === cId)).filter(Boolean);
                  return (
                    <div key={sv.id} style={{ background: isOn ? "#1a1710" : "#141210", border: `1px solid ${isOn ? "#c19748" : "#2a2218"}`, borderRadius: 8, overflow: "hidden", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => toggleService(sv.id)}>
                        <Checkbox checked={isOn} onChange={() => toggleService(sv.id)} onClick={e => e.stopPropagation()} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{sv.name || "Unnamed"}</div>
                          <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>
                            Labor ${nv(sv.laborPerSqFt)}/sqft · {assignedConsumables.length} material{assignedConsumables.length !== 1 ? "s" : ""}
                            {isOn && area > 0 && <span style={{ color: "#c19748", marginLeft: 10 }}>{fmt(svCost)} total</span>}
                          </div>
                        </div>
                      </div>

                      {isOn && (
                        <div style={{ borderTop: "1px solid #2a2518", padding: "12px 14px 14px" }}>
                          <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 10, fontStyle: "italic" }}>
                            Override any cost for this job — leave as-is to use your defaults
                          </div>

                          {/* Labor row */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                            <div style={{ fontSize: 13, color: "#c8b98a", fontFamily: "sans-serif" }}>Labor</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "#5a4f38", fontSize: 12 }}>$</span>
                              <input type="number" value={getOverride(sv.id, "__labor__", sv.laborPerSqFt)}
                                onChange={e => setOverride(sv.id, "__labor__", e.target.value)}
                                style={{ ...iStyle, flex: 1, fontSize: 13 }} />
                            </div>
                            <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", background: "#0f0d0a", border: "1px solid #2a2010", borderRadius: 4, padding: "5px 8px", textAlign: "center" }}>/sqft</div>
                          </div>

                          {/* Material rows */}
                          {assignedConsumables.map(c => {
                            const defaultCost = c.priceType === "bag" ? c.bagPrice : c.unitCost;
                            const ovVal = getOverride(sv.id, c.id, defaultCost);
                            const effectiveC = { ...c, bagPrice: ovVal, unitCost: ovVal };
                            const lineTotal = consumableCost(effectiveC, area);
                            return (
                              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 13, color: "#c8b98a", fontFamily: "sans-serif" }}>{c.name}</div>
                                  {area > 0 && <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{fmt(lineTotal)} total</div>}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ color: "#5a4f38", fontSize: 12 }}>$</span>
                                  <input type="number" value={ovVal} onChange={e => setOverride(sv.id, c.id, e.target.value)}
                                    style={{ ...iStyle, flex: 1, fontSize: 13 }} />
                                </div>
                                <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", background: "#0f0d0a", border: "1px solid #2a2010", borderRadius: 4, padding: "5px 8px", textAlign: "center" }}>
                                  {c.priceType === "bag" ? "$/bag" : c.priceType === "sqft" ? "/sqft" : "flat"}
                                </div>
                              </div>
                            );
                          })}

                          {area > 0 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2a2010", display: "flex", justifyContent: "space-between", fontFamily: "sans-serif" }}>
                              <span style={{ fontSize: 12, color: "#5a4f38" }}>Service total</span>
                              <span style={{ fontSize: 14, color: "#e8c870" }}>{fmt(svCost)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 04 */}
          <Section label="04" title="Customer Pricing">
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[["percent","% Markup"],["manual","Set Manual Price"]].map(([mode, label]) => (
                <button key={mode} onClick={() => setMarkupMode(mode)} style={{
                  flex: 1, padding: "10px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${markupMode === mode ? "#c19748" : "#2e2518"}`,
                  background: markupMode === mode ? "#c19748" : "#1c1812",
                  color: markupMode === mode ? "#0f0f0f" : "#c8b98a",
                  fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, transition: "all 0.18s",
                }}>{label}</button>
              ))}
            </div>
            {markupMode === "percent" ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="number" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} style={{ ...inputStyle, width: 100 }} />
                  <span style={{ color: "#c19748", fontSize: 22 }}>%</span>
                  <span style={{ color: "#6b5f4a", fontSize: 13, fontFamily: "sans-serif" }}>markup over true cost</span>
                </div>
                <input type="range" min={0} max={150} step={1} value={markupPercent} onChange={e => setMarkupPercent(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 12, accentColor: "#c19748" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4a4030", fontFamily: "sans-serif" }}>
                  <span>0%</span><span>50%</span><span>100%</span><span>150%</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#6b5f4a", marginBottom: 8, fontFamily: "sans-serif" }}>Total price you'll charge the customer</div>
                <input type="number" placeholder="e.g. 4500" value={manualPrice} onChange={e => setManualPrice(e.target.value)} style={inputStyle} />
              </div>
            )}
          </Section>

          <button onClick={handleCalculate} disabled={!canCalculate} style={{
            width: "100%", padding: "18px", marginTop: 8,
            background: canCalculate ? "linear-gradient(135deg,#c19748,#a07830)" : "#1c1812",
            border: "none", borderRadius: 8, cursor: canCalculate ? "pointer" : "not-allowed",
            color: canCalculate ? "#0f0f0f" : "#3a3020",
            fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "sans-serif",
            transition: "all 0.2s", boxShadow: canCalculate ? "0 4px 24px rgba(193,151,72,0.3)" : "none",
          }}>
            {canCalculate ? "Calculate Estimate →" : "Enter Square Footage & Select Tile Type"}
          </button>

          {/* Results */}
          {showBreakdown && canCalculate && (
            <div ref={resultRef} style={{ marginTop: 36 }}>
              <div style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "#1c1610", padding: "16px 24px", borderBottom: "1px solid #2e2518" }}>
                  <div style={{ fontSize: 11, color: "#c19748", letterSpacing: 4, textTransform: "uppercase", fontFamily: "sans-serif" }}>Cost Breakdown</div>
                  <div style={{ fontSize: 22, fontWeight: 400, marginTop: 4 }}>True Job Cost</div>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {tileCostPerSqFt > 0
                    ? <LineItem label={`Tile — ${tile.name} (${tileWithWaste.toFixed(0)} sqft w/ ${(wastePct*100).toFixed(0)}% waste @ $${tileCostPerSqFt}/sqft)`} value={tileCost} />
                    : <LineItem label={`Tile — ${tile.name} (not included)`} value={0} dim />
                  }
                  <LineItem label={`Labor — ${tile.name} (${area} sqft × $${laborRate}/sqft)`} value={laborCost} />
                  {thinsetC && <LineItem label={`Thinset (${(area / nv(thinsetC.bagCoverage, 1)).toFixed(1)} bags × $${nv(thinsetC.bagPrice)})`} value={thinsetCost} />}
                  {groutC   && <LineItem label={`Grout (${(area / nv(groutC.bagCoverage, 1)).toFixed(1)} bags × $${nv(groutC.bagPrice)})`}     value={groutCost} />}
                  {enabledServices.map(sv => {
                    const assignedC = sv.consumableIds.map(cId => settings.consumables.find(c => c.id === cId)).filter(Boolean);
                    const laborOv = parseFloat(getOverride(sv.id, "__labor__", sv.laborPerSqFt)) || 0;
                    return (
                      <div key={sv.id}>
                        <LineItem label={sv.name} value={getServiceCost(sv)} section />
                        <LineItem label={`  ↳ Labor ($${laborOv}/sqft)`} value={laborOv * area} indent />
                        {assignedC.map(c => {
                          const ov = getOverride(sv.id, c.id, c.priceType === "bag" ? c.bagPrice : c.unitCost);
                          const effC = { ...c, bagPrice: ov, unitCost: ov };
                          return <LineItem key={c.id} label={`  ↳ ${c.name}`} value={consumableCost(effC, area)} indent />;
                        })}
                      </div>
                    );
                  })}
                  <LineItem label={`Misc Supplies (${nv(settings.miscPercent)}% of labor)`} value={miscSupplies} />
                </div>
                <div style={{ borderTop: "1px solid #2e2518", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16130e" }}>
                  <span style={{ fontSize: 14, color: "#8a7d65", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>Total True Cost</span>
                  <span style={{ fontSize: 28, color: "#e8c870", fontWeight: 400 }}>{fmt(trueCost)}</span>
                </div>
                <div style={{ padding: "8px 24px 16px", color: "#5a4f38", fontSize: 12, fontFamily: "sans-serif", fontStyle: "italic" }}>
                  Cost per sqft: {fmt(trueCost / area)} · Tile to order: {tileWithWaste.toFixed(0)} sqft
                </div>
              </div>

              <div style={{ background: "#13110d", border: "1px solid #c19748", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "linear-gradient(135deg,#1e1810,#13110d)", padding: "16px 24px", borderBottom: "1px solid #2e2518" }}>
                  <div style={{ fontSize: 11, color: "#c19748", letterSpacing: 4, textTransform: "uppercase", fontFamily: "sans-serif" }}>Customer Quote</div>
                  <div style={{ fontSize: 22, fontWeight: 400, marginTop: 4 }}>What You Charge</div>
                </div>
                <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                  <StatBox label="Customer Price" value={fmt(customerPrice)} highlight />
                  <StatBox label="Your Profit"    value={fmt(Math.max(0, profit))} color={profit >= 0 ? "#6dc47a" : "#e05c5c"} />
                  <StatBox label="Margin"         value={`${Math.max(0, margin).toFixed(1)}%`} color={margin >= 25 ? "#6dc47a" : margin >= 10 ? "#e8c870" : "#e05c5c"} />
                </div>
                <div style={{ padding: "0 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <MiniStat label="Price per sqft"     value={fmt(customerPrice / area)} />
                  <MiniStat label="True cost per sqft" value={fmt(trueCost / area)} />
                  <MiniStat label="Tile to order"      value={`${tileWithWaste.toFixed(0)} sqft`} />
                  <MiniStat label="Markup applied"     value={markupMode === "percent" ? `${markupPercent}%` : "Manual"} />
                </div>
                {profit < 0 && (
                  <div style={{ margin: "0 24px 20px", background: "#2a1010", border: "1px solid #6b1010", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#e05c5c", fontFamily: "sans-serif" }}>
                    ⚠ Customer price is below your true cost — you're losing {fmt(Math.abs(profit))} on this job.
                  </div>
                )}
              </div>

              <SendEstimateButtons
                settings={settings}
                area={area}
                tile={tile}
                tileWithWaste={tileWithWaste}
                tilePriceSqFt={tilePriceSqFt}
                activeServices={activeServices}
                serviceState={serviceState}
                trueCost={trueCost}
                customerPrice={customerPrice}
                profit={profit}
                margin={margin}
                markupMode={markupMode}
                markupPercent={markupPercent}
                onEstimateSent={() => setSettings(p => ({ ...p, estimateNumber: p.estimateNumber + 1 }))}
              />
              <button onClick={resetEstimate} style={{
                width: "100%", padding: "14px", background: "transparent",
                border: "1px solid #2e2518", borderRadius: 8, cursor: "pointer",
                color: "#6b5f4a", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase",
              }}>Start New Estimate</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Send Estimate ───────────────────────────────────────────
function SendEstimateButtons({ settings, area, tile, tileWithWaste, tilePriceSqFt,
  activeServices, serviceState, trueCost, customerPrice, profit, margin,
  markupMode, markupPercent, onEstimateSent }) {

  const [showPreview, setShowPreview]   = useState(false);
  const [sendMode, setSendMode]         = useState(null); // "email" | "text"
  const [terms, setTerms]               = useState(settings.defaultTerms || "");
  const [customerName, setCustomerName] = useState("");
  const [projectDesc, setProjectDesc]   = useState("");
  const [sent, setSent]                 = useState(false);

  const fmt = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const c = settings.contractor || {};
  const estNum = String(settings.estimateNumber || 1).padStart(4, "0");
  const today  = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const serviceLines = (activeServices || []).filter(sv => serviceState[sv.id]?.enabled);

  // ── Build email body ──────────────────────────────────────
  function buildEmailBody() {
    const divider = "────────────────────────────────";
    const lines = [];

    if (c.companyName) lines.push(c.companyName);
    if (c.contactName) lines.push(c.contactName);
    if (c.phone)       lines.push(c.phone);
    if (c.email)       lines.push(c.email);
    if (c.website)     lines.push(c.website);
    lines.push("");
    lines.push(divider);
    lines.push("TILE INSTALLATION ESTIMATE");
    lines.push(divider);
    lines.push(`Estimate #: ${estNum}`);
    lines.push(`Date: ${today}`);
    if (customerName) lines.push(`Prepared for: ${customerName}`);
    lines.push("");

    if (projectDesc) {
      lines.push(`Project: ${projectDesc}`);
      lines.push("");
    }

    lines.push("SCOPE OF WORK");
    lines.push(divider);
    lines.push(`Install Area:     ${area} sqft`);
    if (tile) lines.push(`Tile Type:        ${tile.name}`);
    const tileSupplied = !tilePriceSqFt || parseFloat(tilePriceSqFt) === 0;
    lines.push(`Tile Material:    ${tileSupplied ? "Customer supplied / TBD" : fmt(parseFloat(tilePriceSqFt)) + " /sqft"}`);
    lines.push(`Tile to Order:    ${tileWithWaste.toFixed(0)} sqft (includes waste)`);

    if (serviceLines.length > 0) {
      lines.push("");
      lines.push("Additional Services:");
      serviceLines.forEach(sv => lines.push(`  • ${sv.name}`));
    }

    lines.push("");
    lines.push("ESTIMATE SUMMARY");
    lines.push(divider);

    // Material cost
    const matCost = area * parseFloat(tilePriceSqFt || 0);
    if (matCost > 0) lines.push(`Tile Material:    ${fmt(matCost)}`);
    if (tile) lines.push(`Labor:            ${fmt(area * tile.laborRate)}`);

    serviceLines.forEach(sv => {
      const st = serviceState[sv.id] || {};
      const laborCost = area * (parseFloat(st.overrides?.labor ?? sv.laborRate) || 0);
      let svcTotal = laborCost;
      (sv.consumableIds || []).forEach(cId => {
        const cons = (settings.consumables || []).find(c => c.id === cId);
        if (!cons) return;
        const cost = parseFloat(st.overrides?.[cId] ?? (
          cons.priceType === "bag"  ? (area / Math.max(1, parseFloat(cons.bagCoverage))) * parseFloat(cons.bagPrice) :
          cons.priceType === "sqft" ? area * parseFloat(cons.unitCost) :
          parseFloat(cons.unitCost)
        ));
        if (!isNaN(cost)) svcTotal += cost;
      });
      lines.push(`${sv.name}:`.padEnd(18) + fmt(svcTotal));
    });

    const miscCost = trueCost - (
      area * parseFloat(tilePriceSqFt || 0) +
      (tile ? area * tile.laborRate : 0) +
      serviceLines.reduce((acc, sv) => {
        const st = serviceState[sv.id] || {};
        let t = area * (parseFloat(st.overrides?.labor ?? sv.laborRate) || 0);
        (sv.consumableIds || []).forEach(cId => {
          const cons = (settings.consumables || []).find(c => c.id === cId);
          if (!cons) return;
          const cost = parseFloat(st.overrides?.[cId] ?? (
            cons.priceType === "bag"  ? (area / Math.max(1, parseFloat(cons.bagCoverage))) * parseFloat(cons.bagPrice) :
            cons.priceType === "sqft" ? area * parseFloat(cons.unitCost) :
            parseFloat(cons.unitCost)
          ));
          if (!isNaN(cost)) t += cost;
        });
        return acc + t;
      }, 0)
    );
    if (miscCost > 0) lines.push(`Misc Supplies:    ${fmt(miscCost)}`);

    lines.push("");
    lines.push(`TOTAL:            ${fmt(customerPrice)}`);
    lines.push(`Price per sqft:   ${fmt(customerPrice / area)}`);

    if (terms.trim()) {
      lines.push("");
      lines.push("TERMS & CONDITIONS");
      lines.push(divider);
      terms.trim().split("\n").forEach(t => lines.push(t));
    }

    lines.push("");
    lines.push(divider);
    lines.push("Thank you for the opportunity to quote this project.");
    lines.push("Please don\'t hesitate to reach out with any questions.");
    if (c.contactName) lines.push("");
    if (c.contactName) lines.push(c.contactName);
    if (c.companyName) lines.push(c.companyName);
    if (c.phone)       lines.push(c.phone);

    return lines.join("\n");
  }

  // ── Build SMS body ─────────────────────────────────────────
  function buildSMSBody() {
    const lines = [];
    if (c.companyName) lines.push(c.companyName);
    lines.push(`Estimate #${estNum} — ${today}`);
    if (customerName) lines.push(`For: ${customerName}`);
    if (projectDesc)  lines.push(projectDesc);
    lines.push("");
    lines.push("SCOPE OF WORK");
    lines.push(`• ${area} sqft — ${tile?.name || "Tile"} installation`);
    serviceLines.forEach(sv => lines.push(`• ${sv.name}`));
    lines.push("");
    lines.push(`TOTAL: ${fmt(customerPrice)}`);
    lines.push(`(${fmt(customerPrice / area)}/sqft)`);
    if (terms.trim()) {
      lines.push("");
      lines.push("TERMS");
      terms.trim().split("\n").forEach(t => lines.push(t));
    }
    if (c.phone) { lines.push(""); lines.push(`Questions? Call/text ${c.phone}`); }
    return lines.join("\n");
  }

  function handleSend() {
    const body = sendMode === "email" ? buildEmailBody() : buildSMSBody();
    const subject = `Tile Installation Estimate #${estNum}${customerName ? " — " + customerName : ""}`;
    if (sendMode === "email") {
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      window.open(`sms:?&body=${encodeURIComponent(body)}`);
    }
    onEstimateSent();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  if (!showPreview) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <button onClick={() => { setShowPreview(true); setSendMode("email"); }} style={{
          padding: "13px", background: "#1a1208", border: "1px solid #3a2e1a",
          borderRadius: 8, cursor: "pointer", color: "#c19748",
          fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1,
        }}>✉ Email Estimate</button>
        <button onClick={() => { setShowPreview(true); setSendMode("text"); }} style={{
          padding: "13px", background: "#1a1208", border: "1px solid #3a2e1a",
          borderRadius: 8, cursor: "pointer", color: "#c19748",
          fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1,
        }}>💬 Text Estimate</button>
      </div>
    );
  }

  const preview = sendMode === "email" ? buildEmailBody() : buildSMSBody();

  return (
    <div style={{ background: "#13110d", border: "1px solid #3a2e1a", borderRadius: 10, padding: "20px", marginBottom: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 700 }}>
          {sendMode === "email" ? "✉ Email Estimate" : "💬 Text Estimate"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setSendMode(m => m === "email" ? "text" : "email")} style={{
            padding: "5px 10px", background: "transparent", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif",
          }}>Switch to {sendMode === "email" ? "Text" : "Email"}</button>
          <button onClick={() => setShowPreview(false)} style={{
            padding: "5px 10px", background: "transparent", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif",
          }}>✕ Cancel</button>
        </div>
      </div>

      {/* Customer name + project */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Customer Name</div>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Sarah & Tom Williams" style={iStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Project Description</div>
          <input value={projectDesc} onChange={e => setProjectDesc(e.target.value)}
            placeholder="Master Bath Floor & Shower" style={iStyle} />
        </div>
      </div>

      {/* Terms (email mode only) */}
      {sendMode === "email" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Terms (editable)</div>
          <textarea value={terms} onChange={e => setTerms(e.target.value)}
            rows={4} style={{ ...iStyle, resize: "vertical", lineHeight: 1.7, fontSize: 12 }} />
        </div>
      )}

      {/* Preview */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Preview</div>
        <div style={{ background: "#0a0907", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 14px",
          fontSize: 11, color: "#8a7d65", fontFamily: "monospace", lineHeight: 1.8,
          whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto" }}>
          {preview}
        </div>
      </div>

      {/* Estimate number reminder */}
      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 14, fontStyle: "italic" }}>
        Estimate #{estNum} · Sending will increment the estimate number to #{String((settings.estimateNumber || 1) + 1).padStart(4, "0")}
      </div>

      {/* Send button */}
      <button onClick={handleSend} style={{
        width: "100%", padding: "14px", background: "#1e1608",
        border: "1px solid #c19748", borderRadius: 8, cursor: "pointer",
        color: "#c19748", fontSize: 14, fontFamily: "sans-serif",
        fontWeight: 700, letterSpacing: 1,
      }}>
        {sent ? "✓ Opened — check your " + (sendMode === "email" ? "mail app" : "messages app") :
          (sendMode === "email" ? "Open in Mail App →" : "Open in Messages App →")}
      </button>
    </div>
  );
}

// ─── Help Page ────────────────────────────────────────────────────────────────
function HelpPage() {
  const sections = [
    {
      title: "Overview",
      icon: "📋",
      content: [
        { type: "p", text: "The Tile Job Estimator calculates the true cost of a tile job and generates a customer price." },
        { type: "p", text: "Fill out the estimator top to bottom, hit Calculate, and you'll get a full cost breakdown plus your profit and margin." },
        { type: "h", text: "What It Covers" },
        { type: "bullets", items: [
          "Tile material cost with waste factor",
          "Labor based on tile type",
          "Thinset and grout calculated from square footage",
          "Additional services — demo, backer board, membrane, leveling, sealer, and more",
          "Misc supplies as a percentage of labor",
          "Customer price with markup, profit in dollars, and margin percentage",
        ]},
      ],
    },
    {
      title: "Step 1 — Square Footage",
      icon: "📐",
      content: [
        { type: "p", text: "Enter the total area of the job in square feet. This number drives every per-sqft calculation in the estimate." },
        { type: "h", text: "Tips" },
        { type: "bullets", items: [
          "Measure length × width for rectangular rooms",
          "For L-shaped or irregular spaces, break them into rectangles and add the totals",
          "Enter the net tile area — waste is added separately in Step 2",
        ]},
      ],
    },
    {
      title: "Step 2 — Tile Type",
      icon: "⬜",
      content: [
        { type: "p", text: "Select the type of tile being installed. This sets the labor rate for the job." },
        { type: "h", text: "Tile Cost Per Sqft" },
        { type: "p", text: "Enter what you paid for the tile per sqft. Leave it at 0 if the customer supplied the tile or it hasn't been purchased yet — it will show as not included in the breakdown." },
        { type: "h", text: "Waste %" },
        { type: "p", text: "The waste percentage accounts for cuts, breakage, and pattern matching. The app calculates how many sqft to order automatically." },
        { type: "bullets", items: [
          "Standard install — 10%",
          "Diagonal or pattern layout — 15%",
          "Complex cuts or large format — 15–20%",
        ]},
      ],
    },
    {
      title: "Step 3 — Additional Services",
      icon: "🔧",
      content: [
        { type: "p", text: "Check any services that apply to this job. Each service expands to show its labor and materials." },
        { type: "h", text: "How It Works" },
        { type: "bullets", items: [
          "Each service pulls its materials from your Consumables & Rates settings",
          "All costs are pre-filled from your defaults",
          "You can override any cost for this specific job without changing your defaults",
          "The service total updates live as you adjust values",
        ]},
        { type: "h", text: "Common Services" },
        { type: "bullets", items: [
          "Cement Backer Board — substrate for wet areas",
          "Waterproof Membrane — shower floors, wet rooms",
          "Leveling Clips System — large format tile on imperfect floors",
          "Demo / Removal — tear out existing tile or flooring",
          "Subfloor Prep — self-leveling compound and primer",
          "Stone / Grout Sealer — required for natural stone",
        ]},
      ],
    },
    {
      title: "Step 4 — Customer Pricing",
      icon: "💰",
      content: [
        { type: "p", text: "Choose between a percentage markup over your true cost or a manual flat price." },
        { type: "h", text: "Markup Mode" },
        { type: "p", text: "The app adds a percentage on top of your true cost:" },
        { type: "formula", text: "Customer Price = True Cost × (1 + Markup% ÷ 100)" },
        { type: "p", text: "Example: $1,000 true cost at 40% markup → $1,000 × 1.40 = $1,400 customer price." },
        { type: "h", text: "Markup vs. Margin — Not the Same Number" },
        { type: "p", text: "Markup is calculated on your cost. Margin is calculated on your selling price. Using the example above:" },
        { type: "bullets", items: ["Markup: $400 profit ÷ $1,000 cost = 40%", "Margin: $400 profit ÷ $1,400 price = 28.6%"] },
        { type: "p", text: "Both numbers are correct — they just measure different things. Margin will always be lower than your markup." },
        { type: "h", text: "Slider Reference" },
        { type: "bullets", items: [
          "0% — you charge your exact cost, zero profit",
          "40% — common starting point for tile contractors",
          "100% — you charge double your cost (cost × 2)",
          "150% — you charge 2.5× your cost",
        ]},
        { type: "h", text: "Manual Price Mode" },
        { type: "p", text: "If you already quoted a flat number to the customer, switch to Manual Price and type it in. The app works backwards from that number to show your profit and margin. If the price is below your true cost, a red warning appears." },
      ],
    },
    {
      title: "Reading the Results",
      icon: "📊",
      content: [
        { type: "h", text: "Cost Breakdown" },
        { type: "p", text: "Every line item is listed — tile material, labor, thinset, grout, each service with its materials broken out, and misc supplies." },
        { type: "h", text: "Customer Quote" },
        { type: "bullets", items: [
          "Customer Price — what you charge",
          "Your Profit — customer price minus true cost in dollars",
          "Margin — profit as a percentage of the customer price",
        ]},
        { type: "h", text: "Color Coding" },
        { type: "bullets", items: [
          "Green — healthy margin (25%+)",
          "Yellow — thin margin (10–25%)",
          "Red — below 10% or losing money",
        ]},
        { type: "h", text: "Per Sqft Summary" },
        { type: "p", text: "The bottom of the breakdown shows your price per sqft and true cost per sqft — useful for quickly comparing against your gut feel on a job." },
      ],
    },
    {
      title: "Settings — Consumables & Rates",
      icon: "🧱",
      content: [
        { type: "p", text: "Your master list of all materials. Every material used across your jobs lives here — thinset, grout, membrane, clips, tape, and more." },
        { type: "h", text: "Price Types" },
        { type: "bullets", items: [
          "Bag — enter a bag price and sqft coverage; the app calculates how many bags are needed based on the job area",
          "Per Sqft — a straight $/sqft cost multiplied by the job area",
          "Flat — a fixed cost per job regardless of size",
        ]},
        { type: "h", text: "Misc Supplies %" },
        { type: "p", text: "A percentage of your labor cost added automatically to every estimate to cover blades, spacers, buckets, and other consumables too small to track individually." },
        { type: "h", text: "Default Markup %" },
        { type: "p", text: "Pre-fills the markup field on every new estimate. Set it to your typical rate and adjust per job as needed." },
      ],
    },
    {
      title: "Settings — Tile Types",
      icon: "🔲",
      content: [
        { type: "p", text: "Add and manage the tile types you install. Each type sets a labor rate that drives the install cost calculation." },
        { type: "h", text: "What to Set Here" },
        { type: "bullets", items: [
          "Labor rate $/sqft — your install rate for that tile type",
          "Install note — shown on the estimator as a reminder (e.g. 'Sealer required', 'Leveling clips required')",
        ]},
        { type: "h", text: "What Gets Set Per Job" },
        { type: "p", text: "Tile material cost and waste percentage are always entered on the estimator, not here — they change with every order and supplier." },
      ],
    },
    {
      title: "Settings — Services",
      icon: "⚙️",
      content: [
        { type: "p", text: "Build out the additional services you offer. Each service has a labor rate and a list of materials it uses." },
        { type: "h", text: "Setting Up a Service" },
        { type: "bullets", items: [
          "Give it a name and a labor rate per sqft",
          "Tap the material pill buttons to assign consumables from your Consumables & Rates list",
          "Assigned materials will be pulled into the estimator whenever this service is checked on a job",
        ]},
        { type: "h", text: "Per-Job Overrides" },
        { type: "p", text: "When a service is active on an estimate, you can override any material cost or the labor rate for that job only. Your saved defaults are never changed." },
      ],
    },
    {
      title: "Misc Supplies & Default Markup",
      icon: "🔩",
      content: [
        { type: "h", text: "Misc Supplies %" },
        { type: "p", text: "A percentage of your total labor cost added automatically to every estimate. Covers blades, spacers, mixing paddles, buckets, and other small items that are hard to track individually." },
        { type: "formula", text: "Misc Supplies Cost = Total Labor Cost × (Misc % ÷ 100)" },
        { type: "p", text: "3% is a reasonable starting point for most jobs. Increase it for complex installs with more cutting." },
        { type: "h", text: "Default Markup %" },
        { type: "p", text: "Pre-fills the markup slider on every new estimate. Set this to your typical rate so you don't have to adjust it every time. You can always change it per job." },
      ],
    },
    {
      title: "Version History",
      icon: "📝",
      content: [
        { type: "bullets", items: [
          "v0.2.6 — Send estimate via email or text; contractor info settings; auto-incrementing estimate numbers; default terms block",
          "v0.2.5 — All help sections converted to rich format with headings, bullets, and formula blocks",
          "v0.2.4 — Expanded Customer Pricing help with markup formula, markup vs. margin explanation, and slider reference",
          "v0.2.3 — Consumables & Rates redesigned to card layout — full material names always visible",
          "v0.2.2 — Fixed iOS Safari white border and color-scheme issues",
          "v0.2.1 — Custom styled checkboxes replacing native browser checkboxes",
          "v0.2.0 — Added Help tab with full usage guide",
          "v0.1.0 — Initial release",
        ]},
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Documentation</div>
        <div style={{ fontSize: 22, fontWeight: 400, color: "#d4c49a" }}>How to Use This App</div>
        <div style={{ fontSize: 13, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 6, fontStyle: "italic" }}>
          A quick guide to getting accurate estimates every time
        </div>
      </div>

      {sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <HelpSection icon={sec.icon} title={sec.title} content={sec.content} />
        </div>
      ))}

      <div style={{ marginTop: 32, padding: "16px 20px", background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", fontStyle: "italic", textAlign: "center" }}>
        v0.2.6 — Tile Job Estimator · Built for tile contractors
      </div>
    </div>
  );
}

function RichContent({ blocks }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.type === "p") return (
          <p key={i} style={{ margin: "0 0 10px", color: "#8a7d65", fontSize: 13, fontFamily: "sans-serif", lineHeight: 1.7 }}>{b.text}</p>
        );
        if (b.type === "h") return (
          <div key={i} style={{ marginTop: 14, marginBottom: 6, fontSize: 12, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{b.text}</div>
        );
        if (b.type === "formula") return (
          <div key={i} style={{ margin: "8px 0 12px", padding: "10px 14px", background: "#13110d", border: "1px solid #2e2518", borderRadius: 6, fontSize: 13, color: "#e8c870", fontFamily: "monospace", letterSpacing: 0.5 }}>{b.text}</div>
        );
        if (b.type === "bullets") return (
          <ul key={i} style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            {b.items.map((item, j) => (
              <li key={j} style={{ color: "#8a7d65", fontSize: 13, fontFamily: "sans-serif", lineHeight: 1.7, marginBottom: 3 }}>{item}</li>
            ))}
          </ul>
        );
        return null;
      })}
    </div>
  );
}

function HelpSection({ icon, title, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", background: "transparent", border: "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px 46px", fontSize: 13, color: "#8a7d65", fontFamily: "sans-serif", lineHeight: 1.7, borderTop: "1px solid #1e1c16" }}>
          <div style={{ paddingTop: 12 }}>
            {Array.isArray(content) ? <RichContent blocks={content} /> : content}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function InfoPill({ label, value, gold }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, color: gold ? "#e8c870" : "#c8b98a", fontFamily: "sans-serif", fontWeight: gold ? 700 : 400 }}>{value}</div>
    </div>
  );
}
function Section({ label, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", letterSpacing: 3, opacity: 0.7 }}>{label}</span>
        <span style={{ fontSize: 17, color: "#d4c49a", fontWeight: 400 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #2e2518, transparent)", marginLeft: 8 }} />
      </div>
      {children}
    </div>
  );
}
function LineItem({ label, value, indent, section, dim }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: `7px ${indent ? "24px 7px 36px" : "24px"}`,
      borderBottom: "1px solid #1a1710",
      background: section ? "#161208" : "transparent" }}>
      <span style={{ fontSize: indent ? 12 : 13, color: dim ? "#3a3020" : indent ? "#6b5f4a" : "#8a7d65", fontFamily: "sans-serif", fontStyle: indent ? "italic" : "normal" }}>{label}</span>
      <span style={{ fontSize: indent ? 12 : 14, color: dim ? "#3a3020" : indent ? "#6b5f4a" : "#c8b98a", fontFamily: "sans-serif" }}>{dim && value === 0 ? "—" : fmt(value)}</span>
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
function MiniStat({ label, value }) {
  return (
    <div style={{ background: "#0f0d0a", borderRadius: 6, padding: "10px 14px", border: "1px solid #1e1c16" }}>
      <div style={{ fontSize: 11, color: "#4a4030", fontFamily: "sans-serif", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#8a7d65", fontFamily: "sans-serif" }}>{value}</div>
    </div>
  );
}
function EmptyState({ msg }) {
  return <div style={{ padding: "20px", textAlign: "center", color: "#5a4f38", fontFamily: "sans-serif", fontSize: 13, border: "1px dashed #2e2518", borderRadius: 8 }}>{msg}</div>;
}

const inputStyle = { background: "#1a1610", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 16px", color: "#f0ede6", fontSize: 16, fontFamily: "Georgia,serif", width: "100%", boxSizing: "border-box", outline: "none" };
const iStyle     = { background: "#1a1610", border: "1px solid #2e2518", borderRadius: 4, padding: "7px 10px",  color: "#f0ede6", fontSize: 13, fontFamily: "Georgia,serif", width: "100%", boxSizing: "border-box", outline: "none" };
const delBtnStyle = { background: "transparent", border: "1px solid #3a1010", borderRadius: 4, color: "#804040", fontSize: 15, cursor: "pointer", padding: "4px 10px", flexShrink: 0 };
const addBtnStyle = { width: "100%", padding: "12px", marginTop: 4, background: "transparent", border: "1px dashed #3a2e18", borderRadius: 8, cursor: "pointer", color: "#c19748", fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1 };
