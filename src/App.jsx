import { useState, useEffect, useRef, Component } from "react";

// ─── Error Boundary ────────────────────────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("Tile Job Estimator crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", background: "#0f0f0f", color: "#f5f0e8",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 32, fontFamily: "sans-serif", textAlign: "center",
        }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 15, color: "#c19748", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13, color: "#8a7d5e", lineHeight: 1.6, marginBottom: 20 }}>
              The app hit an unexpected error and needs to reload. Your saved estimates and settings are safe — they're stored on this device and won't be lost.
            </div>
            <button onClick={() => window.location.reload()} style={{
              padding: "12px 24px", background: "linear-gradient(135deg,#c19748,#a07830)",
              border: "none", borderRadius: 8, cursor: "pointer", color: "#0f0f0f",
              fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
            }}>Reload App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── IndexedDB Database Layer ─────────────────────────────────────────────────
const DB_NAME = "tje_db";
const DB_VERSION = 3;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("estimates")) {
        const es = db.createObjectStore("estimates", { keyPath: "id" });
        es.createIndex("date", "date");
        es.createIndex("customerName", "customerName");
      }
      if (!db.objectStoreNames.contains("customers")) {
        const cs = db.createObjectStore("customers", { keyPath: "id" });
        cs.createIndex("name", "name");
      }
      if (!db.objectStoreNames.contains("drafts")) {
        const ds = db.createObjectStore("drafts", { keyPath: "id" });
        ds.createIndex("date", "date");
        ds.createIndex("customerName", "customerName");
      }
      if (!db.objectStoreNames.contains("shoppingLists")) {
        const sl = db.createObjectStore("shoppingLists", { keyPath: "id" });
        sl.createIndex("estimateId", "estimateId");
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror  = e => reject(e.target.error);
  });
}

function dbGet(store, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbGetAll(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbPut(store, record) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(record);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbDelete(store, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbClear(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).clear();
    req.onsuccess = e => resolve();
    req.onerror   = e => reject(e.target.error);
  }));
}

// Migrate old localStorage estimates into IndexedDB (runs once)
async function migrateLocalStorageEstimates() {
  try {
    const raw = localStorage.getItem("tje_estimates");
    if (!raw) return;
    const old = JSON.parse(raw);
    if (!old || !old.length) return;
    for (const record of old) {
      await dbPut("estimates", record);
    }
    localStorage.removeItem("tje_estimates");
  } catch (e) {}
}

migrateLocalStorageEstimates();

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
// priceType: "bag" (unit price + sqft coverage — unitLabel picks bag/box/roll/etc.), "sqft" ($/sqft), "flat" ($/unit)
const CONSUMABLE_CATEGORIES = [
  "Adhesives",
  "Grout & Finishing",
  "Substrate & Backer",
  "Waterproofing",
  "Leveling System",
  "Sealers",
  "Fasteners & Hardware",
  "Substrate Prep",
  "Other",
];

const SEED_CONSUMABLES = [
  { id: "thinset",    name: "Thinset / Mortar",        category: "Adhesives",           priceType: "bag",  bagPrice: 25, bagCoverage: 40, unitLabel: "bag", unitCost: "",  note: "50 lb bag", role: "thinset" },
  { id: "grout",      name: "Grout",                   category: "Grout & Finishing",   priceType: "bag",  bagPrice: 18, bagCoverage: 50, unitLabel: "bag", unitCost: "",  note: "Varies by joint width", role: "grout" },
  { id: "backer",     name: "Cement Backer Board",     category: "Substrate & Backer",  priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.65, note: "" },
  { id: "membrane",   name: "Waterproof Membrane",     category: "Waterproofing",       priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.90, note: "" },
  { id: "memtape",    name: "Membrane Seam Tape",      category: "Waterproofing",       priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 18,   note: "Per roll" },
  { id: "levelclips", name: "Leveling Clips",          category: "Leveling System",     priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.45, note: "" },
  { id: "wedges",     name: "Leveling Wedges",         category: "Leveling System",     priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 22,   note: "Per bag" },
  { id: "sealer",     name: "Stone / Grout Sealer",    category: "Sealers",             priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 35,   note: "Per bottle" },
  { id: "primer",     name: "Subfloor Primer",         category: "Substrate Prep",      priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 35,   note: "Per bucket" },
  { id: "selfLevel",  name: "Self-Leveling Compound",  category: "Substrate Prep",      priceType: "sqft", bagPrice: "",  bagCoverage: "", unitCost: 0.60, note: "" },
  { id: "backscrews", name: "Backer Board Screws",     category: "Fasteners & Hardware",priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 8,    note: "Per box" },
  { id: "meshtape",   name: "Fiberglass Mesh Tape",    category: "Fasteners & Hardware",priceType: "flat", bagPrice: "",  bagCoverage: "", unitCost: 12,   note: "Per roll" },
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

// Job Types: a named bundle of services with no cost of its own — a convenience preset.
// Selecting one on the estimator auto-enables its serviceIds (same non-destructive behavior as tile serviceIds).
const SEED_JOB_TYPES = [
  { id: "kitchenfloor_jt", name: "Kitchen Floor", icon: "🍽️", serviceIds: ["subfloor_svc"], notes: "" },
  { id: "backsplash_jt",   name: "Backsplash",    icon: "🖼️", serviceIds: [], notes: "" },
  { id: "shower_jt",       name: "Shower",        icon: "🚿", serviceIds: ["membrane_svc", "demo_svc"], notes: "" },
];

const TILE_ICONS = ["⬜","🔲","🪨","◼","🔷","🟫","🟦","🟩","⬛","🔶","🔸","🔹"];
const JOB_TYPE_ICONS = ["🍽️","🖼️","🚿","🛁","🧱","🏠","🪜","🧹","🔧","⬛","🟫","🔲"];
const PRICE_TYPES = ["bag", "sqft", "flat"];
const PRICE_TYPE_LABELS = { bag: "By Coverage (price + sqft covered)", sqft: "Per Sqft ($/sqft)", flat: "Flat ($/unit)" };
const UNIT_LABEL_OPTIONS = ["bag", "box", "sheet", "roll", "bucket", "gallon", "case", "pail"];

const PRICE_CHECK_STORES = [
  { key: "homedepot", label: "Home Depot", url: q => `https://www.homedepot.com/s/${encodeURIComponent(q)}` },
  { key: "lowes",     label: "Lowe's",      url: q => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}` },
  { key: "flooranddecor", label: "Floor & Decor", url: q => `https://www.flooranddecor.com/search?q=${encodeURIComponent(q)}` },
];

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(n) { return (isNaN(n) || n == null) ? "$—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function nv(v, fb = 0) { return parseFloat(v) || fb; }

// Backfills the "role" field on consumables saved before it existed, so existing
// installs keep working exactly as before until the contractor tags more brands.
function migrateConsumableRoles(consumables) {
  return (consumables || []).map(c => {
    if (c.role) return c;
    if (c.id === "thinset") return { ...c, role: "thinset" };
    if (c.id === "grout")   return { ...c, role: "grout" };
    return { ...c, role: c.role || null };
  });
}

function newTile()        { return { id: uid(), name: "", icon: "⬜", labor: "", notes: "", serviceIds: [] }; }
function newConsumable()  { return { id: uid(), name: "", category: "Other", priceType: "sqft", bagPrice: "", bagCoverage: "", unitLabel: "bag", coverageBasis: "area", applyWaste: false, useCustomWaste: false, wasteOverride: "", unitCost: "", note: "", role: null }; }
function newService()     { return { id: uid(), name: "", laborPerSqFt: "", consumableIds: [] }; }
function newJobType()     { return { id: uid(), name: "", icon: "🏠", serviceIds: [], notes: "" }; }

// Units of a coverage-type material (bag/box/roll/etc) needed for a given sqft area.
// Always rounds UP — you buy whole units, so this reflects true purchase cost.
function coverageUnits(area, coverage) {
  return Math.ceil((area || 0) / Math.max(1, parseFloat(coverage) || 1));
}

// Label for a coverage-type material's unit (bag/box/roll/...), defaulting to "bag" for legacy data
function unitLabelOf(c) { return (c && c.unitLabel) || "bag"; }
// Resolve which consumable to use for a role slot (thinset/grout): explicit pick first,
// then the first material tagged with that role, then (for pre-role legacy data) the seed id.
function pickConsumableByRole(consumables, role, selectedId) {
  const list = consumables || [];
  return list.find(c => c.id === selectedId)
      || list.find(c => c.role === role)
      || list.find(c => c.id === role)
      || null;
}

// Pluralizes a unit label for display (box -> boxes, bag -> bags, etc.)
function pluralUnit(label, count) {
  const n = Math.round(count);
  const l = label || "bag";
  if (n === 1) return l;
  return /[xsz]$|ch$|sh$/i.test(l) ? `${l}es` : `${l}s`;
}

// Picks area or linear feet as the quantity basis for a coverage material, then applies waste % if enabled
function materialBasis(c, area, linearFeet, wastePct) {
  let basis = (c && c.coverageBasis === "linear") ? (linearFeet || 0) : (area || 0);
  if (c && c.applyWaste) {
    const hasCustom = c.useCustomWaste && c.wasteOverride !== "" && c.wasteOverride != null;
    const effectiveWaste = hasCustom ? (parseFloat(c.wasteOverride) || 0) / 100 : (wastePct || 0);
    basis = basis * (1 + effectiveWaste);
  }
  return basis;
}

// Whole units needed for a coverage material, accounting for its basis (area/linear) and waste setting
function materialUnits(c, area, linearFeet, wastePct) {
  return coverageUnits(materialBasis(c, area, linearFeet, wastePct), c.bagCoverage);
}

// Cost of a consumable. linearFeet/wastePct only matter for coverage ("bag") materials;
// qty only matters for flat per-piece materials (e.g. corners, end caps).
function consumableCost(c, area, linearFeet = 0, wastePct = 0, qty = 1) {
  if (!c) return 0;
  if (c.priceType === "bag") {
    return materialUnits(c, area, linearFeet, wastePct) * nv(c.bagPrice);
  }
  if (c.priceType === "sqft") return (area || 0) * nv(c.unitCost);
  if (c.priceType === "flat") return nv(c.unitCost) * (nv(qty, 1) || 1);
  return 0;
}

// ── Areas: a job can be made of several areas (Kitchen Floor, Backsplash, Shower...), each
// with its own sqft/tile/thinset/grout/services. One customer + one combined price for the whole job. ──
function newAreaInput() {
  return {
    id: uid(), jobTypeId: null, name: "", sqft: "", linearFt: "",
    tileId: null, thinsetId: null, groutId: null, tilePriceSqFt: "", wastePercent: "10",
    serviceState: {},
  };
}

// Wraps a legacy pre-Areas record (flat sqft/tileId/etc.) into a single-item areas array,
// so old saved estimates/drafts keep loading and displaying correctly.
function areasOf(record) {
  if (!record) return [];
  if (Array.isArray(record.areas) && record.areas.length > 0) return record.areas;
  return [{
    id: record.tileId || "legacy",
    jobTypeId: null, name: "",
    sqft: record.sqft, linearFt: record.linearFt,
    tileId: record.tileId, thinsetId: record.thinsetId, groutId: record.groutId,
    tilePriceSqFt: record.tilePriceSqFt, wastePercent: record.wastePercent,
    serviceState: record.serviceState || {},
  }];
}

// Label shown for an area everywhere it's presented to the customer or contractor:
// the assigned Job Type name (e.g. "Backsplash", "Kitchen Floor") takes priority since
// it's the clearest description of what the area actually is; falls back to the tile
// name, then a generic "Area N".
function areaLabel(input, tile, idx, jobTypes) {
  const jt = input?.jobTypeId ? (jobTypes || []).find(j => j.id === input.jobTypeId) : null;
  if (jt?.name) return jt.name;
  if (tile?.name) return tile.name;
  return "Area " + (idx + 1);
}

// Pure per-area cost calculation — the single source of truth used by the live estimator,
// History display, shopping list, customer presentation, and every sent-estimate format.
function computeAreaCost(input, settings) {
  const area = nv(input.sqft);
  const linearFeet = nv(input.linearFt);
  const wastePct = (parseFloat(input.wastePercent) || 0) / 100;
  const tile = (settings.tiles || []).find(t => t.id === input.tileId) || null;
  const laborRate = nv(tile?.labor);
  const tileWithWaste = area * (1 + wastePct);
  const tileCostPerSqFt = parseFloat(input.tilePriceSqFt) || 0;
  const tileCost = tileWithWaste * tileCostPerSqFt;
  const laborCost = area * laborRate;

  const thinsetC = pickConsumableByRole(settings.consumables, "thinset", input.thinsetId);
  const groutC   = pickConsumableByRole(settings.consumables, "grout", input.groutId);
  const thinsetCost = thinsetC ? consumableCost(thinsetC, area, linearFeet, wastePct) : 0;
  const groutCost   = groutC   ? consumableCost(groutC, area, linearFeet, wastePct) : 0;

  const serviceState = input.serviceState || {};
  const enabledServices = (settings.services || []).filter(sv => serviceState[sv.id]?.enabled);
  function getServiceCost(sv) {
    const laborCostSv = nv(serviceState[sv.id]?.overrides?.__labor__ ?? sv.laborPerSqFt) * area;
    const matCost = (sv.consumableIds || []).reduce((sum, cId) => {
      const c = (settings.consumables || []).find(x => x.id === cId);
      if (!c) return sum;
      const override = serviceState[sv.id]?.overrides?.[cId];
      const effectiveC = override !== undefined ? { ...c, bagPrice: override, unitCost: override } : c;
      const qty = c.priceType === "flat" ? nv(serviceState[sv.id]?.overrides?.["qty__" + cId], 1) : 1;
      return sum + consumableCost(effectiveC, area, linearFeet, wastePct, qty);
    }, 0);
    return laborCostSv + matCost;
  }
  const servicesCost = enabledServices.reduce((sum, sv) => sum + getServiceCost(sv), 0);
  const subtotal = tileCost + laborCost + thinsetCost + groutCost + servicesCost;

  return {
    area, linearFeet, wastePct, tile, laborRate, tileWithWaste, tileCostPerSqFt, tileCost, laborCost,
    thinsetC, groutC, thinsetCost, groutCost, enabledServices, servicesCost, subtotal, getServiceCost,
  };
}

// Builds the "what to buy" list for a saved estimate/draft: tile + always-on
// thinset/grout + every material assigned to an enabled service, with overrides
// applied exactly as the estimator applied them. Quantities use the same
// coverage-unit rounding as the rest of the app.
function buildShoppingListItems(estimate, settings) {
  if (!estimate) return [];
  const consumables = (settings && settings.consumables) || [];
  const services     = (settings && settings.services) || [];
  const tiles        = (settings && settings.tiles) || [];

  const lines = [];
  function addLine(c, qty, unitLabel, cost) {
    if (!c) return;
    const existing = lines.find(l => l.materialId === c.id);
    if (existing) {
      existing.qty += qty;
      existing.cost += cost;
    } else {
      lines.push({ id: "m_" + c.id, materialId: c.id, name: c.name, qty, unitLabel, cost: cost || 0, note: c.note || "" });
    }
  }
  function addMaterial(c, area, linearFeet, wastePct, override, qtyOverride) {
    if (!c) return;
    const effectiveC = override !== undefined ? { ...c, bagPrice: override, unitCost: override } : c;
    const flatQty = c.priceType === "flat" ? nv(qtyOverride, 1) : 1;
    const cost = consumableCost(effectiveC, area, linearFeet, wastePct, flatQty);
    if (c.priceType === "bag") {
      const units = materialUnits(effectiveC, area, linearFeet, wastePct);
      addLine(c, units, pluralUnit(unitLabelOf(c), units), cost);
    } else if (c.priceType === "sqft") {
      addLine(c, area, "sqft", cost);
    } else {
      addLine(c, flatQty, flatQty === 1 ? "" : "", cost);
    }
  }

  areasOf(estimate).forEach(a => {
    const area        = nv(a.sqft);
    const linearFeet  = nv(a.linearFt);
    const wastePct    = nv(a.wastePercent, 10) / 100;
    const serviceState = a.serviceState || {};
    const tile = tiles.find(t => t.id === a.tileId);

    // Tile itself (skip if customer-supplied / no price entered)
    const tileCostPerSqFt = nv(a.tilePriceSqFt);
    if (tile && tileCostPerSqFt > 0) {
      const tileWithWaste = area * (1 + wastePct);
      const existing = lines.find(l => l.materialId === "tile_" + tile.id);
      const addQty = Math.ceil(tileWithWaste), addCost = tileWithWaste * tileCostPerSqFt;
      if (existing) { existing.qty += addQty; existing.cost += addCost; }
      else lines.push({ id: "tile_" + tile.id, materialId: "tile_" + tile.id, name: tile.name, qty: addQty, unitLabel: "sqft", cost: addCost, note: "Includes waste" });
    }

    // Thinset & grout are always part of the job — use whichever brand was picked for this area
    const thinsetC2 = pickConsumableByRole(consumables, "thinset", a.thinsetId);
    const groutC2   = pickConsumableByRole(consumables, "grout", a.groutId);
    [thinsetC2, groutC2].forEach(c => { if (c) addMaterial(c, area, linearFeet, wastePct); });

    // Materials from every enabled service in this area
    services.filter(sv => serviceState[sv.id]?.enabled).forEach(sv => {
      (sv.consumableIds || []).forEach(cId => {
        const c = consumables.find(x => x.id === cId);
        if (!c) return;
        const override = serviceState[sv.id]?.overrides?.[cId];
        const qtyOverride = serviceState[sv.id]?.overrides?.["qty__" + cId];
        addMaterial(c, area, linearFeet, wastePct, override, qtyOverride);
      });
    });
  });

  return lines;
}

// Job status — manually set, tracks where a sent estimate stands with the customer.
const JOB_STATUSES = [
  { key: "awaiting", label: "Awaiting Approval", icon: "📤", color: "#c19748" },
  { key: "approved", label: "Approved",          icon: "✅", color: "#6dc47a" },
  { key: "complete", label: "Complete",          icon: "🏁", color: "#7aa8d9" },
  { key: "declined", label: "Declined",          icon: "✕",  color: "#c15b48" },
];
function jobStatusOf(e) {
  return JOB_STATUSES.find(s => s.key === (e && e.jobStatus)) || JOB_STATUSES[0];
}

// Materials status — fully automatic, derived from the shopping list's checked state.
// Returns null if there's nothing to buy on this job yet (no materials at all).
function materialsStatusOf(estimate, settings, shoppingListRec) {
  const autoItems = buildShoppingListItems(estimate, settings);
  const customItems = (shoppingListRec && shoppingListRec.customItems) || [];
  const checked = (shoppingListRec && shoppingListRec.checked) || {};
  const all = [...autoItems, ...customItems];
  if (all.length === 0) return null;
  const stillNeeded = all.some(i => !checked[i.id]);
  return stillNeeded
    ? { key: "need", label: "Need to Buy", icon: "🛒", color: "#c19748" }
    : { key: "ready", label: "All Purchased", icon: "📦", color: "#6dc47a" };
}

// ─── Shared expanded-estimate detail ──────────────────────────────────────────
// Used by History, Accounting, and the Customer tab so that opening any sent estimate,
// from anywhere in the app, offers the exact same information and actions — Resend, Load
// into Estimator, Shopping List, Edit, Delete, status picker, economics, and the full line
// items. The one status-driven difference: a job marked Complete is locked everywhere this
// renders (no Load, no Edit), same as it's always been in History.
function EstimateExpandedDetail({ record, onUpdate, onLoad, onDelete, onOpenShoppingList }) {
  const [isResending, setIsResending] = useState(false);
  const [resendMode, setResendMode] = useState("email");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fmt = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const isComplete = (record.jobStatus || "awaiting") === "complete";

  function startEdit() {
    setEditForm({
      customerName: record.customerName || "", customerEmail: record.customerEmail || "",
      customerPhone: record.customerPhone || "", projectDesc: record.projectDesc || "",
      emailText: record.emailText || "",
    });
    setIsEditing(true);
    setIsResending(false);
  }

  return (
    <div style={{ borderTop: "1px solid #2e2518" }}>
      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#0f0d0a", flexWrap: "wrap" }}>
        <button onClick={e2 => { e2.stopPropagation(); setIsResending(r => !r); setIsEditing(false); }} style={{
          flex: 1, minWidth: 90, padding: "8px", background: "#1a1610", border: "1px solid #3a2e1a",
          borderRadius: 6, cursor: "pointer", color: "#c19748", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
        }}>{isResending ? "✕ Cancel" : "↩ Resend"}</button>
        {!isComplete && onLoad && (
          <button onClick={e2 => { e2.stopPropagation(); onLoad(record); }} style={{
            flex: 1, minWidth: 90, padding: "8px", background: "#1a1610", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#6dc47a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
          }}>↑ Load into Estimator</button>
        )}
        {onOpenShoppingList && (
          <button onClick={e2 => { e2.stopPropagation(); onOpenShoppingList(record); }} style={{
            flex: 1, minWidth: 90, padding: "8px", background: "#1a1610", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#c19748", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
          }}>🛒 List</button>
        )}
        {!isComplete && (
          <button onClick={e2 => { e2.stopPropagation(); isEditing ? setIsEditing(false) : startEdit(); }} style={{
            flex: 1, minWidth: 90, padding: "8px", background: "#1a1610", border: "1px solid #2e2518",
            borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
          }}>{isEditing ? "✕ Cancel Edit" : "✎ Edit"}</button>
        )}
        {onDelete && (
          <button onClick={e2 => { e2.stopPropagation(); if (window.confirm("Delete this estimate record?")) onDelete(record.id); }} style={{
            padding: "8px 12px", background: "none", border: "1px solid #3a2518",
            borderRadius: 6, cursor: "pointer", color: "#6b5f4a", fontSize: 12, fontFamily: "sans-serif",
          }}>✕</button>
        )}
      </div>
      {isComplete && (
        <div style={{ padding: "0 16px 12px", fontSize: 11, color: "#6b5f4a", fontFamily: "sans-serif", fontStyle: "italic" }}>
          🔒 Locked — this job is marked Complete. Change its status below to edit or load it.
        </div>
      )}

      {/* Job economics — charged, cost, profit, margin */}
      {record.trueCost != null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "0 16px 12px", background: "#0f0d0a" }}>
          {[
            ["Charged", fmt(record.totalPrice), "#e8c870"],
            ["Cost", fmt(record.trueCost), "#c8b98a"],
            ["Profit", fmt(record.profit), record.profit >= 0 ? "#6dc47a" : "#c15b48"],
            ["Margin", (record.margin != null ? record.margin.toFixed(0) : "0") + "%", record.margin >= 0 ? "#6dc47a" : "#c15b48"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color, fontFamily: "sans-serif", fontWeight: 700 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Job status picker — always available, even on Complete jobs, since it's how you unlock them */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px 12px", background: "#0f0d0a", flexWrap: "wrap" }}>
        {JOB_STATUSES.map(st => {
          const active = (record.jobStatus || "awaiting") === st.key;
          return (
            <button key={st.key} onClick={e2 => { e2.stopPropagation(); onUpdate(record.id, { jobStatus: st.key }); }} style={{
              padding: "6px 10px", borderRadius: 14, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", fontWeight: 600,
              border: `1px solid ${active ? st.color : "#2e2518"}`,
              background: active ? st.color + "1a" : "transparent",
              color: active ? st.color : "#5a4f38",
            }}>{st.icon} {st.label}</button>
          );
        })}
      </div>

      {/* Edit form */}
      {isEditing && !isComplete && (
        <div style={{ padding: "0 16px 16px", background: "#0f0d0a" }}>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            {[["customerName", "Customer Name"], ["customerEmail", "Customer Email"], ["customerPhone", "Customer Phone"], ["projectDesc", "Project Description"]].map(([key, label]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                <input value={editForm[key] || ""} onChange={ev => setEditForm(p => ({ ...p, [key]: ev.target.value }))} style={iStyle} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Estimate Text (Email)</div>
              <textarea value={editForm.emailText || ""} onChange={ev => setEditForm(p => ({ ...p, emailText: ev.target.value }))}
                rows={5} style={{ ...iStyle, resize: "vertical", lineHeight: 1.6, fontSize: 11, fontFamily: "monospace" }} />
            </div>
          </div>
          <button onClick={() => { onUpdate(record.id, editForm); setIsEditing(false); }} style={{
            width: "100%", padding: "10px", background: "linear-gradient(135deg,#c19748,#a07830)",
            border: "none", borderRadius: 6, cursor: "pointer", color: "#0f0f0f",
            fontSize: 13, fontWeight: 700, fontFamily: "sans-serif",
          }}>Save Changes</button>
        </div>
      )}

      {/* Resend options */}
      {isResending && (
        <div style={{ padding: "0 16px 16px", background: "#0f0d0a" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {["email", "text"].map(mode => (
              <button key={mode} onClick={() => setResendMode(mode)} style={{
                flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${resendMode === mode ? "#c19748" : "#2e2518"}`,
                background: resendMode === mode ? "#1e1a10" : "#13110d",
                color: resendMode === mode ? "#c19748" : "#5a4f38",
                fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
              }}>{mode === "email" ? "✉ Email" : "💬 Text"}</button>
            ))}
          </div>
          <button onClick={() => {
            const body = resendMode === "email" ? (record.emailText || record.smsText || "") : (record.smsText || record.emailText || "");
            const subject = "Tile Installation Estimate #" + record.estNum + (record.customerName ? " — " + record.customerName : "");
            if (resendMode === "email") {
              window.open("mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body));
            } else {
              const to = record.customerPhone ? record.customerPhone.replace(/\D/g, "") : "";
              window.open("sms:" + (to ? "+" + to : "") + "?&body=" + encodeURIComponent(body));
            }
          }} style={{
            width: "100%", padding: "10px", background: "#1e1608",
            border: "1px solid #c19748", borderRadius: 6, cursor: "pointer",
            color: "#c19748", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700,
          }}>
            {resendMode === "email" ? "Open in Mail App →" : "Open in Messages App →"}
          </button>
        </div>
      )}

      {/* Full line-item text, exactly as sent to the customer */}
      <div style={{ padding: "16px" }}>
        <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Line Items
        </div>
        <div style={{
          background: "#0a0907", border: "1px solid #1e1a12", borderRadius: 6, padding: "12px 14px",
          fontSize: 11, color: "#6b5f4a", fontFamily: "monospace", lineHeight: 1.8,
          whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto",
        }}>
          {record.emailText || record.smsText || "No line items saved — this record was created before text storage was added."}
        </div>
      </div>
    </div>
  );
}

// ─── Check Price button (store picker popup) ─────────────────────────────────
function CheckPriceButton({ term, style }) {
  const [open, setOpen] = useState(false);
  if (!term) return null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5,
          color: "#e8813a", fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer",
          border: "1px solid #4a3520", borderRadius: 14, padding: "5px 10px",
          background: "rgba(232,129,58,0.08)", flexShrink: 0, ...style,
        }}
      >🔍 Check Price</button>
      {open && (
        <>
          <div onClick={e => { e.stopPropagation(); setOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 61,
            background: "#1a1208", border: "1px solid #3a2e1a", borderRadius: 8,
            minWidth: 170, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden",
          }}>
            {PRICE_CHECK_STORES.map(store => (
              <a key={store.key} href={store.url(term)} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "10px 14px", fontSize: 13, color: "#f5f0e8",
                  fontFamily: "sans-serif", textDecoration: "none", borderBottom: "1px solid #2e2518",
                }}>{store.label}</a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Material Picker (grouped checklist + search) ────────────────────────────
function MaterialPicker({ consumables, assignedIds, onToggle }) {

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? consumables.filter(c => (c.name || "").toLowerCase().includes(q))
    : consumables;

  // Group by category
  const groups = {};
  filtered.forEach(c => {
    const cat = c.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  });
  const groupKeys = Object.keys(groups).sort();

  const assignedCount = assignedIds.length;

  return (
    <div>
      {/* Collapsed header */}
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "9px 12px",
        background: "#13110d", border: "1px solid #2e2518", borderRadius: open ? "6px 6px 0 0" : 6,
        cursor: "pointer", fontFamily: "sans-serif",
      }}>
        <span style={{ fontSize: 12, color: "#8a7d65", textTransform: "uppercase", letterSpacing: 1 }}>
          Assigned Materials
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {assignedCount > 0 && (
            <span style={{ fontSize: 12, color: "#c19748", fontFamily: "sans-serif", fontWeight: 600 }}>
              {assignedCount} selected
            </span>
          )}
          <span style={{ color: "#5a4f38", fontSize: 14 }}>{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div style={{ border: "1px solid #2e2518", borderTop: "none", borderRadius: "0 0 6px 6px", background: "#0f0d0a" }}>
          {/* Search bar */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e1a12" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1610", border: "1px solid #2e2518", borderRadius: 5, padding: "6px 10px" }}>
              <span style={{ color: "#4a4030", fontSize: 13 }}>🔍</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search materials…"
                style={{ background: "transparent", border: "none", outline: "none", color: "#d4c49a", fontFamily: "sans-serif", fontSize: 13, flex: 1 }}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#5a4f38", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

          {/* Material list */}
          {consumables.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", fontStyle: "italic" }}>
              Add materials in Consumables & Rates first
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", fontStyle: "italic" }}>
              No materials match "{query}"
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {groupKeys.map(cat => (
                <div key={cat}>
                  {/* Category header — hidden when searching */}
                  {!q && (
                    <div style={{ padding: "6px 14px 4px", fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                      {cat}
                    </div>
                  )}
                  {groups[cat].map(c => {
                    const assigned = assignedIds.includes(c.id);
                    return (
                      <div key={c.id} onClick={() => onToggle(c.id)} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "9px 14px", cursor: "pointer",
                        background: assigned ? "rgba(193,151,72,0.07)" : "transparent",
                        transition: "background 0.1s",
                      }}>
                        <div style={{
                          width: 16, height: 16, flexShrink: 0, borderRadius: 3,
                          border: assigned ? "2px solid #c19748" : "2px solid #3a3020",
                          background: assigned ? "#c19748" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {assigned && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize: 13, color: assigned ? "#d4c49a" : "#5a4f38", fontFamily: "sans-serif", flex: 1 }}>
                          {c.name || "Unnamed"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple checklist for assigning services to a tile type — no search/grouping needed since service lists are typically short
function ServicePicker({ services, assignedIds, onToggle }) {
  if (!services || services.length === 0) {
    return (
      <div style={{ padding: "10px 12px", fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", fontStyle: "italic", border: "1px solid #2e2518", borderRadius: 6, background: "#0f0d0a" }}>
        Add services in the Services tab first
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid #2e2518", borderRadius: 6, background: "#0f0d0a", padding: "6px 0" }}>
      {services.map(sv => {
        const assigned = assignedIds.includes(sv.id);
        return (
          <div key={sv.id} onClick={() => onToggle(sv.id)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "9px 14px", cursor: "pointer",
            background: assigned ? "rgba(193,151,72,0.07)" : "transparent",
          }}>
            <div style={{
              width: 16, height: 16, flexShrink: 0, borderRadius: 3,
              border: assigned ? "2px solid #c19748" : "2px solid #3a3020",
              background: assigned ? "#c19748" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {assigned && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: assigned ? "#d4c49a" : "#5a4f38", fontFamily: "sans-serif", flex: 1 }}>
              {sv.name || "Unnamed"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared list-row / modal building blocks ──────────────────────────────────
const rowStyle = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  textAlign: "left", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8,
  padding: "12px 14px", marginBottom: 8, cursor: "pointer", fontFamily: "sans-serif",
};
const rowTitleStyle = { fontSize: 13.5, color: "#f5f0e8", fontWeight: 600 };
const rowSubtitleStyle = { fontSize: 12, color: "#8a7d5e", marginTop: 2 };
const chevronStyle = { color: "#5a4f38", fontSize: 16, flexShrink: 0 };
const groupHeaderStyle = { fontSize: 10, color: "#c19748", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 };
const italicHintStyle = { fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 16, fontStyle: "italic" };
const fieldLabelStyle = { fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 };
const primaryBtnStyle = {
  width: "100%", padding: 14, marginTop: 6,
  background: "linear-gradient(135deg, #c19748, #a07830)",
  border: "none", borderRadius: 8, cursor: "pointer",
  color: "#0f0f0f", fontSize: 13, fontWeight: 700,
  letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "sans-serif",
};

function materialPriceLine(c) {
  if (c.priceType === "bag") return `$${c.bagPrice || 0}/${unitLabelOf(c)}${c.bagCoverage ? ` · covers ${c.bagCoverage} sqft` : ""}`;
  if (c.priceType === "sqft") return `$${c.unitCost || 0}/sqft`;
  return `$${c.unitCost || 0} flat`;
}

function ModalShell({ title, onClose, onDelete, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, background: "#1a1208", border: "1px solid #3a2e1a",
        borderRadius: 14, padding: 22, maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, color: "#f5f0e8", fontWeight: 700, fontFamily: "sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7d5e", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
        {onDelete && (
          <button onClick={onDelete} style={{
            width: "100%", padding: 12, marginTop: 10, background: "transparent",
            border: "1px solid #3a1010", borderRadius: 8, color: "#c15b48", fontSize: 12,
            fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "sans-serif",
          }}>Delete</button>
        )}
      </div>
    </div>
  );
}

function MaterialFormModal({ material, onSave, onDelete, onClose }) {
  const [f, setF] = useState(() => material ? { ...material } : newConsumable());
  const isEdit = !!material;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <ModalShell title={isEdit ? "Edit Material" : "Add Material"} onClose={onClose} onDelete={isEdit ? () => onDelete(f.id) : null}>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Material Name</div>
        <input placeholder="e.g. Sanded Grout" value={f.name} onChange={e => set("name", e.target.value)} style={{ ...iStyle, fontSize: 14 }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Category</div>
        <select value={f.category || "Other"} onChange={e => set("category", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
          {CONSUMABLE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Role</div>
        <div style={{ fontSize: 11.5, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 6 }}>
          Thinset and Grout are picked per job on the estimator. Tag every brand you stock so you can choose between them.
        </div>
        <select value={f.role || ""} onChange={e => set("role", e.target.value || null)} style={{ ...iStyle, cursor: "pointer" }}>
          <option value="">None</option>
          <option value="thinset">Thinset</option>
          <option value="grout">Grout</option>
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Price Type</div>
        <select value={f.priceType} onChange={e => set("priceType", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
          {PRICE_TYPES.map(pt => <option key={pt} value={pt}>{pt === "bag" ? "By Coverage" : pt === "sqft" ? "Per Sqft" : "Flat"}</option>)}
        </select>
      </div>
      {f.priceType === "bag" && (
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabelStyle}>Sold By</div>
          <select value={f.unitLabel || "bag"} onChange={e => set("unitLabel", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
            {UNIT_LABEL_OPTIONS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: f.priceType === "bag" ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>{f.priceType === "bag" ? `${(f.unitLabel || "bag").charAt(0).toUpperCase() + (f.unitLabel || "bag").slice(1)} Price` : "Unit Cost"}</div>
            <CheckPriceButton term={f.name} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#5a4f38", fontSize: 13 }}>$</span>
            <input type="number" placeholder="0.00"
              value={f.priceType === "bag" ? f.bagPrice : f.unitCost}
              onChange={e => set(f.priceType === "bag" ? "bagPrice" : "unitCost", e.target.value)}
              style={iStyle} />
          </div>
        </div>
        {f.priceType === "bag" && (
          <div>
            <div style={fieldLabelStyle}>Coverage ({f.coverageBasis === "linear" ? "ln ft" : "sqft"}/{f.unitLabel || "bag"})</div>
            <input type="number" placeholder={`${f.coverageBasis === "linear" ? "ln ft" : "sqft"}/${f.unitLabel || "bag"}`} value={f.bagCoverage} onChange={e => set("bagCoverage", e.target.value)} style={iStyle} />
          </div>
        )}
      </div>
      {f.priceType === "bag" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabelStyle}>Measure By</div>
            <select value={f.coverageBasis || "area"} onChange={e => set("coverageBasis", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
              <option value="area">Job Area (sqft) — tile, backer, thinset, grout...</option>
              <option value="linear">Linear Feet — trim, edge strips, cove base...</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: f.applyWaste ? 10 : 18, cursor: "pointer", fontFamily: "sans-serif" }}>
            <input type="checkbox" checked={!!f.applyWaste} onChange={e => set("applyWaste", e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12.5, color: "#c8b98a" }}>Add waste % on top before rounding up to whole {pluralUnit(f.unitLabel || "bag", 2)}</span>
          </label>
          {f.applyWaste && (
            <div style={{ marginBottom: 18, paddingLeft: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: f.useCustomWaste ? 10 : 0, cursor: "pointer", fontFamily: "sans-serif" }}>
                <input type="checkbox" checked={!!f.useCustomWaste} onChange={e => set("useCustomWaste", e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 12.5, color: "#8a7d65" }}>Use a custom waste % for this material (instead of the job's waste %)</span>
              </label>
              {f.useCustomWaste && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 140 }}>
                  <input type="number" placeholder="e.g. 15" value={f.wasteOverride} onChange={e => set("wasteOverride", e.target.value)} style={iStyle} min="0" />
                  <span style={{ color: "#5a4f38", fontSize: 13 }}>%</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div style={{ marginBottom: 18 }}>
        <div style={fieldLabelStyle}>Note (optional)</div>
        <input placeholder="e.g. 50 lb bag" value={f.note || ""} onChange={e => set("note", e.target.value)} style={{ ...iStyle, fontSize: 12 }} />
      </div>
      <button onClick={() => onSave(f)} style={primaryBtnStyle}>{isEdit ? "Save Changes" : "Add Material"}</button>
    </ModalShell>
  );
}

function TileFormModal({ tile, services, onSave, onDelete, onClose }) {
  const [f, setF] = useState(() => tile ? { serviceIds: [], ...tile } : newTile());
  const isEdit = !!tile;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleService = svId => {
    setF(p => {
      const has = p.serviceIds.includes(svId);
      return { ...p, serviceIds: has ? p.serviceIds.filter(x => x !== svId) : [...p.serviceIds, svId] };
    });
  };

  return (
    <ModalShell title={isEdit ? "Edit Tile Type" : "Add Tile Type"} onClose={onClose} onDelete={isEdit ? () => onDelete(f.id) : null}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={fieldLabelStyle}>Icon</div>
          <select value={f.icon} onChange={e => set("icon", e.target.value)}
            style={{ background: "#1a1610", border: "1px solid #2e2518", borderRadius: 4, color: "#f0ede6", fontSize: 18, padding: "7px 8px", cursor: "pointer", outline: "none" }}>
            {TILE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={fieldLabelStyle}>Tile Name</div>
          <input placeholder="e.g. Marble Mosaic" value={f.name} onChange={e => set("name", e.target.value)} style={{ ...iStyle, fontSize: 14, fontWeight: 700 }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>Labor $/sqft</div>
          <CheckPriceButton term={f.name} />
        </div>
        <input type="number" placeholder="0.00" value={f.labor} onChange={e => set("labor", e.target.value)} style={iStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Note (optional)</div>
        <input placeholder="Shown on estimator" value={f.notes || ""} onChange={e => set("notes", e.target.value)} style={{ ...iStyle, fontSize: 12 }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={fieldLabelStyle}>Required Services</div>
        <div style={{ fontSize: 11.5, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8 }}>
          Auto-enabled on the estimator whenever this tile type is selected
        </div>
        <ServicePicker services={services || []} assignedIds={f.serviceIds || []} onToggle={toggleService} />
      </div>
      <button onClick={() => onSave(f)} style={primaryBtnStyle}>{isEdit ? "Save Changes" : "Add Tile Type"}</button>
    </ModalShell>
  );
}

function JobTypeFormModal({ jobType, services, onSave, onDelete, onClose }) {
  const [f, setF] = useState(() => jobType ? { serviceIds: [], ...jobType } : newJobType());
  const isEdit = !!jobType;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleService = svId => {
    setF(p => {
      const has = p.serviceIds.includes(svId);
      return { ...p, serviceIds: has ? p.serviceIds.filter(x => x !== svId) : [...p.serviceIds, svId] };
    });
  };

  return (
    <ModalShell title={isEdit ? "Edit Job Type" : "Add Job Type"} onClose={onClose} onDelete={isEdit ? () => onDelete(f.id) : null}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={fieldLabelStyle}>Icon</div>
          <select value={f.icon} onChange={e => set("icon", e.target.value)}
            style={{ background: "#1a1610", border: "1px solid #2e2518", borderRadius: 4, color: "#f0ede6", fontSize: 18, padding: "7px 8px", cursor: "pointer", outline: "none" }}>
            {JOB_TYPE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={fieldLabelStyle}>Job Type Name</div>
          <input placeholder="e.g. Kitchen Floor, Shower" value={f.name} onChange={e => set("name", e.target.value)} style={{ ...iStyle, fontSize: 14, fontWeight: 700 }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Note (optional)</div>
        <input placeholder="Shown on estimator" value={f.notes || ""} onChange={e => set("notes", e.target.value)} style={{ ...iStyle, fontSize: 12 }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={fieldLabelStyle}>Services to Auto-Enable</div>
        <div style={{ fontSize: 11.5, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8 }}>
          Turned on automatically when this job type is selected on the estimator. You can still toggle any of them off per job.
        </div>
        <ServicePicker services={services || []} assignedIds={f.serviceIds || []} onToggle={toggleService} />
      </div>
      <button onClick={() => onSave(f)} style={primaryBtnStyle}>{isEdit ? "Save Changes" : "Add Job Type"}</button>
    </ModalShell>
  );
}

function ServiceFormModal({ service, consumables, onSave, onDelete, onClose }) {
  const [f, setF] = useState(() => service ? { ...service } : newService());
  const isEdit = !!service;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = cId => {
    setF(p => {
      const has = p.consumableIds.includes(cId);
      return { ...p, consumableIds: has ? p.consumableIds.filter(x => x !== cId) : [...p.consumableIds, cId] };
    });
  };

  return (
    <ModalShell title={isEdit ? "Edit Service" : "Add Service"} onClose={onClose} onDelete={isEdit ? () => onDelete(f.id) : null}>
      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabelStyle}>Service Name</div>
        <input placeholder="e.g. Niche Build" value={f.name} onChange={e => set("name", e.target.value)} style={{ ...iStyle, fontSize: 14, fontWeight: 700 }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={fieldLabelStyle}>Labor $/sqft</div>
        <input type="number" placeholder="0.00" value={f.laborPerSqFt} onChange={e => set("laborPerSqFt", e.target.value)} style={iStyle} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={fieldLabelStyle}>Materials Used</div>
        <MaterialPicker consumables={consumables} assignedIds={f.consumableIds} onToggle={toggle} />
      </div>
      <button onClick={() => onSave(f)} style={primaryBtnStyle}>{isEdit ? "Save Changes" : "Add Service"}</button>
    </ModalShell>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
const SETTINGS_MENU = [
  { key: "contractor",  label: "Contractor Info",     desc: "Your business name, logo & contact details" },
  { key: "consumables", label: "Consumables & Rates",  desc: "Thinset, grout, labor rates & waste factor" },
  { key: "tiles",       label: "Tile Types",           desc: "Saved tile products & pricing" },
  { key: "services",    label: "Services",             desc: "Add-on services you offer customers" },
  { key: "jobtypes",    label: "Job Types",            desc: "Presets like Kitchen Floor or Shower that auto-pick services" },
];

function SettingsPage({ settings, onSave, onExport, onImport }) {
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [tab, setTab] = useState(null);
  const importRef = useRef(null);

  function setField(k, v) { setS(p => ({ ...p, [k]: v })); }

  // Consumables CRUD — save handles both add (new id) and edit (existing id)
  function saveC(f) {
    setS(p => {
      const exists = p.consumables.some(c => c.id === f.id);
      return { ...p, consumables: exists ? p.consumables.map(c => c.id === f.id ? f : c) : [...p.consumables, f] };
    });
  }
  function deleteC(id) { setS(p => ({ ...p, consumables: p.consumables.filter(c => c.id !== id) })); }

  // Tiles CRUD
  function saveT(f) {
    setS(p => {
      const exists = p.tiles.some(t => t.id === f.id);
      return { ...p, tiles: exists ? p.tiles.map(t => t.id === f.id ? f : t) : [...p.tiles, f] };
    });
  }
  function deleteT(id) { setS(p => ({ ...p, tiles: p.tiles.filter(t => t.id !== id) })); }

  // Services CRUD
  function saveSv(f) {
    setS(p => {
      const exists = p.services.some(sv => sv.id === f.id);
      return { ...p, services: exists ? p.services.map(sv => sv.id === f.id ? f : sv) : [...p.services, f] };
    });
  }
  function deleteSv(id) { setS(p => ({ ...p, services: p.services.filter(sv => sv.id !== id) })); }

  // Job Types CRUD
  function saveJt(f) {
    setS(p => {
      const exists = (p.jobTypes || []).some(jt => jt.id === f.id);
      return { ...p, jobTypes: exists ? p.jobTypes.map(jt => jt.id === f.id ? f : jt) : [...(p.jobTypes || []), f] };
    });
  }
  function deleteJt(id) { setS(p => ({ ...p, jobTypes: (p.jobTypes || []).filter(jt => jt.id !== id) })); }

  // Add/Edit modal state: null | { mode: "add" } | { mode: "edit", id }
  const [matModal, setMatModal] = useState(null);
  const [tileModal, setTileModal] = useState(null);
  const [svModal, setSvModal] = useState(null);
  const [jtModal, setJtModal] = useState(null);

  // ── Share Pricing Setup (export/import materials, tiles, services only) ──
  const pricingImportRef = useRef(null);
  const [pricingReview, setPricingReview] = useState(null); // null | { consumablesDiff, tilesDiff, servicesDiff, choices }

  function exportPricingSetup() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    const payload = {
      type: "tje-pricing-setup",
      version: APP_VERSION,
      exportDate: now.toISOString(),
      consumables: s.consumables,
      tiles: s.tiles,
      services: s.services,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tje-pricing-setup-${stamp}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function keyName(name) { return (name || "").trim().toLowerCase(); }

  // Classify an imported list against the current list: identical / new / conflict
  function diffSimpleList(importedList, currentList, compareFields) {
    const currentByName = {};
    currentList.forEach(item => { currentByName[keyName(item.name)] = item; });
    const conflicts = [];
    const newItems = [];
    let identicalCount = 0;
    importedList.forEach(imp => {
      const cur = currentByName[keyName(imp.name)];
      if (!cur) {
        newItems.push(imp);
      } else {
        const identical = compareFields.every(f => String(cur[f] ?? "") === String(imp[f] ?? ""));
        if (identical) identicalCount++;
        else conflicts.push({ key: keyName(imp.name), current: cur, imported: imp });
      }
    });
    return { conflicts, newItems, identicalCount };
  }

  function diffServices(importedServices, importedConsumables, currentServices, currentConsumables) {
    const nameById = list => Object.fromEntries(list.map(c => [c.id, keyName(c.name)]));
    const impNameById = nameById(importedConsumables);
    const curNameById = nameById(currentConsumables);
    const matNames = (sv, byId) => sv.consumableIds.map(id => byId[id]).filter(Boolean).sort().join("|");

    const currentByName = {};
    currentServices.forEach(sv => { currentByName[keyName(sv.name)] = sv; });
    const conflicts = [];
    const newItems = [];
    let identicalCount = 0;
    importedServices.forEach(imp => {
      const cur = currentByName[keyName(imp.name)];
      if (!cur) {
        newItems.push(imp);
      } else {
        const laborMatch = String(cur.laborPerSqFt ?? "") === String(imp.laborPerSqFt ?? "");
        const matsMatch = matNames(cur, curNameById) === matNames(imp, impNameById);
        if (laborMatch && matsMatch) identicalCount++;
        else conflicts.push({ key: keyName(imp.name), current: cur, imported: imp });
      }
    });
    return { conflicts, newItems, identicalCount };
  }

  function startPricingImport(jsonText) {
    let parsed;
    try { parsed = JSON.parse(jsonText); } catch (e) {
      alert("Failed to read file. Make sure it's a valid pricing setup export from this app.");
      return;
    }
    if (!parsed || (!parsed.consumables && !parsed.tiles && !parsed.services)) {
      alert("This doesn't look like a valid Pricing Setup file.");
      return;
    }
    const importedConsumables = parsed.consumables || [];
    const importedTiles = parsed.tiles || [];
    const importedServices = parsed.services || [];

    const consumablesDiff = diffSimpleList(importedConsumables, s.consumables, ["priceType", "bagPrice", "bagCoverage", "unitLabel", "unitCost", "category", "note"]);
    const tilesDiff = diffSimpleList(importedTiles, s.tiles, ["labor", "icon", "notes"]);
    const servicesDiff = diffServices(importedServices, importedConsumables, s.services, s.consumables);

    const choices = {};
    consumablesDiff.conflicts.forEach(c => { choices[c.key + ":mat"] = "mine"; });
    tilesDiff.conflicts.forEach(c => { choices[c.key + ":tile"] = "mine"; });
    servicesDiff.conflicts.forEach(c => { choices[c.key + ":svc"] = "mine"; });

    setPricingReview({ importedConsumables, importedTiles, importedServices, consumablesDiff, tilesDiff, servicesDiff, choices });
  }

  function applyPricingImport() {
    const { importedConsumables, importedTiles, importedServices, consumablesDiff, tilesDiff, servicesDiff, choices } = pricingReview;

    // 1. Merge consumables, building an id map (imported id -> final local id)
    const idMap = {};
    let newConsumables = [...s.consumables];
    const curConsByName = Object.fromEntries(s.consumables.map(c => [keyName(c.name), c]));
    importedConsumables.forEach(imp => {
      const cur = curConsByName[keyName(imp.name)];
      if (!cur) {
        const fresh = { ...imp, id: uid() };
        newConsumables.push(fresh);
        idMap[imp.id] = fresh.id;
      } else {
        idMap[imp.id] = cur.id;
        const isConflict = consumablesDiff.conflicts.some(c => c.key === keyName(imp.name));
        if (isConflict && choices[keyName(imp.name) + ":mat"] === "imported") {
          newConsumables = newConsumables.map(c => c.id === cur.id ? { ...imp, id: cur.id } : c);
        }
      }
    });

    // 2. Merge tiles (no cross-references)
    let newTiles = [...s.tiles];
    const curTilesByName = Object.fromEntries(s.tiles.map(t => [keyName(t.name), t]));
    importedTiles.forEach(imp => {
      const cur = curTilesByName[keyName(imp.name)];
      if (!cur) {
        newTiles.push({ ...imp, id: uid() });
      } else {
        const isConflict = tilesDiff.conflicts.some(c => c.key === keyName(imp.name));
        if (isConflict && choices[keyName(imp.name) + ":tile"] === "imported") {
          newTiles = newTiles.map(t => t.id === cur.id ? { ...imp, id: cur.id } : t);
        }
      }
    });

    // 3. Merge services, remapping consumableIds through idMap
    let newServices = [...s.services];
    const curSvByName = Object.fromEntries(s.services.map(sv => [keyName(sv.name), sv]));
    importedServices.forEach(imp => {
      const remapped = { ...imp, consumableIds: imp.consumableIds.map(id => idMap[id]).filter(Boolean) };
      const cur = curSvByName[keyName(imp.name)];
      if (!cur) {
        newServices.push({ ...remapped, id: uid() });
      } else {
        const isConflict = servicesDiff.conflicts.some(c => c.key === keyName(imp.name));
        if (isConflict && choices[keyName(imp.name) + ":svc"] === "imported") {
          newServices = newServices.map(sv => sv.id === cur.id ? { ...remapped, id: cur.id } : sv);
        }
      }
    });

    setS(p => ({ ...p, consumables: newConsumables, tiles: newTiles, services: newServices }));
    setPricingReview(null);
  }



  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>
      {tab === null ? (
        <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
          {SETTINGS_MENU.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              textAlign: "left", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8,
              padding: "16px 18px", cursor: "pointer", fontFamily: "sans-serif",
            }}>
              <div>
                <div style={{ fontSize: 14, color: "#f5f0e8", fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#5a4f38", marginTop: 3 }}>{item.desc}</div>
              </div>
              <span style={{ color: "#5a4f38", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => setTab(null)} style={{
          background: "none", border: "none", color: "#c19748", fontSize: 13, fontWeight: 700,
          letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: 0, marginBottom: 24,
          fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: 6,
        }}>‹ Back to Settings</button>
      )}

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

          {/* Logo Upload */}
          <div style={{ marginBottom: 20, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Company Logo</div>
            <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 12, fontStyle: "italic" }}>
              Shown on the customer presentation screen. Use a PNG or JPG under 500KB — square or landscape works best.
            </div>
            {s.contractor?.logo ? (
              <div style={{ marginBottom: 12 }}>
                <img src={s.contractor.logo} alt="Company logo" style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 6, objectFit: "contain", background: "#1a1610", padding: 8 }} />
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#3a3020", fontFamily: "sans-serif", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Default (shown until you upload your own)</div>
                <img src="/icons/default-logo.png" alt="Default logo" style={{ maxHeight: 60, maxWidth: "100%", borderRadius: 6, objectFit: "contain", background: "#1a1610", padding: 8, opacity: 0.7 }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{
                flex: 1, padding: "9px 0", background: "#1a1610", border: "1px solid #3a3020",
                borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 12,
                fontFamily: "sans-serif", textAlign: "center", fontWeight: 600,
              }}>
                {s.contractor?.logo ? "Replace Logo" : "Upload Logo"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 512000) { alert("Please use an image under 500KB."); return; }
                  const reader = new FileReader();
                  reader.onload = ev => setS(p => ({ ...p, contractor: { ...p.contractor, logo: ev.target.result } }));
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} />
              </label>
              {s.contractor?.logo && (
                <button onClick={() => setS(p => ({ ...p, contractor: { ...p.contractor, logo: "" } }))} style={{
                  padding: "9px 14px", background: "none", border: "1px solid #3a2518",
                  borderRadius: 6, cursor: "pointer", color: "#6b5f4a", fontSize: 12, fontFamily: "sans-serif",
                }}>Remove</button>
              )}
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
          <div style={italicHintStyle}>
            All materials used across your jobs. Services pull from this list.
          </div>

          {CONSUMABLE_CATEGORIES.filter(cat => s.consumables.some(c => (c.category || "Other") === cat)).map(cat => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={groupHeaderStyle}>{cat}</div>
              {s.consumables.filter(c => (c.category || "Other") === cat).map(c => (
                <button key={c.id} onClick={() => setMatModal({ mode: "edit", id: c.id })} style={rowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={rowTitleStyle}>{c.name || "Unnamed material"}</div>
                    <div style={rowSubtitleStyle}>{materialPriceLine(c)}{c.role ? ` · ${c.role === "thinset" ? "Thinset" : "Grout"} option` : ""}</div>
                  </div>
                  <span style={chevronStyle}>›</span>
                </button>
              ))}
            </div>
          ))}
          <button onClick={() => setMatModal({ mode: "add" })} style={addBtnStyle}>+ Add Material</button>

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
          <div style={italicHintStyle}>
            Tile types set the labor rate only. Tile material cost and waste % are entered per job on the estimator.
          </div>
          {s.tiles.map(t => (
            <button key={t.id} onClick={() => setTileModal({ mode: "edit", id: t.id })} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={rowTitleStyle}>{t.icon}  {t.name || "Unnamed tile"}</div>
                <div style={rowSubtitleStyle}>${nv(t.labor)}/sqft labor{t.notes ? ` · ${t.notes}` : ""}</div>
              </div>
              <span style={chevronStyle}>›</span>
            </button>
          ))}
          <button onClick={() => setTileModal({ mode: "add" })} style={addBtnStyle}>+ Add Tile Type</button>
        </>
      )}

      {/* ── Services ── */}
      {tab === "services" && (
        <>
          <div style={italicHintStyle}>
            Each service has a labor rate and a list of materials pulled from your Consumables list.
          </div>
          {s.services.map(sv => (
            <button key={sv.id} onClick={() => setSvModal({ mode: "edit", id: sv.id })} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={rowTitleStyle}>{sv.name || "Unnamed service"}</div>
                <div style={rowSubtitleStyle}>
                  ${nv(sv.laborPerSqFt)}/sqft labor · {sv.consumableIds.length} material{sv.consumableIds.length !== 1 ? "s" : ""}
                </div>
              </div>
              <span style={chevronStyle}>›</span>
            </button>
          ))}
          <button onClick={() => setSvModal({ mode: "add" })} style={addBtnStyle}>+ Add Service</button>
        </>
      )}

      {/* ── Job Types ── */}
      {tab === "jobtypes" && (
        <>
          <div style={italicHintStyle}>
            A Job Type is just a shortcut — picking one on the estimator auto-enables the services below. It has no cost of its own.
          </div>
          {(s.jobTypes || []).map(jt => (
            <button key={jt.id} onClick={() => setJtModal({ mode: "edit", id: jt.id })} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={rowTitleStyle}>{jt.icon}  {jt.name || "Unnamed job type"}</div>
                <div style={rowSubtitleStyle}>
                  {jt.serviceIds && jt.serviceIds.length > 0
                    ? `${jt.serviceIds.length} service${jt.serviceIds.length !== 1 ? "s" : ""} auto-enabled`
                    : "No services assigned yet"}
                </div>
              </div>
              <span style={chevronStyle}>›</span>
            </button>
          ))}
          <button onClick={() => setJtModal({ mode: "add" })} style={addBtnStyle}>+ Add Job Type</button>
        </>
      )}

      {matModal && (
        <MaterialFormModal
          material={matModal.mode === "edit" ? s.consumables.find(c => c.id === matModal.id) : null}
          onSave={f => { saveC(f); setMatModal(null); }}
          onDelete={id => { deleteC(id); setMatModal(null); }}
          onClose={() => setMatModal(null)}
        />
      )}
      {tileModal && (
        <TileFormModal
          tile={tileModal.mode === "edit" ? s.tiles.find(t => t.id === tileModal.id) : null}
          services={s.services}
          onSave={f => { saveT(f); setTileModal(null); }}
          onDelete={id => { deleteT(id); setTileModal(null); }}
          onClose={() => setTileModal(null)}
        />
      )}
      {svModal && (
        <ServiceFormModal
          service={svModal.mode === "edit" ? s.services.find(sv => sv.id === svModal.id) : null}
          consumables={s.consumables}
          onSave={f => { saveSv(f); setSvModal(null); }}
          onDelete={id => { deleteSv(id); setSvModal(null); }}
          onClose={() => setSvModal(null)}
        />
      )}
      {jtModal && (
        <JobTypeFormModal
          jobType={jtModal.mode === "edit" ? (s.jobTypes || []).find(jt => jt.id === jtModal.id) : null}
          services={s.services}
          onSave={f => { saveJt(f); setJtModal(null); }}
          onDelete={id => { deleteJt(id); setJtModal(null); }}
          onClose={() => setJtModal(null)}
        />
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

        {/* ── Backup / Restore ── */}
        <div style={{ marginTop: 16, padding: "14px 16px", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
            Backup & Restore
          </div>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 12, fontStyle: "italic" }}>
            Export saves all your settings to a JSON file. Import restores from a previously exported backup.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onExport(s)} style={{
              flex: 1, padding: "11px 0",
              background: "#1a1610", border: "1px solid #3a3020",
              borderRadius: 8, cursor: "pointer",
              color: "#c19748", fontSize: 13, fontWeight: 600,
              fontFamily: "sans-serif", letterSpacing: 1,
              transition: "border-color 0.15s",
            }}>⬇ Export Backup</button>
            <button onClick={() => {
              const ok = window.confirm(
                "Importing a backup will REPLACE all current settings, estimates, and customers on this device with what's in the backup file.\n\nThis can't be undone. Continue?"
              );
              if (ok) importRef.current?.click();
            }} style={{
              flex: 1, padding: "11px 0",
              background: "#1a1610", border: "1px solid #3a3020",
              borderRadius: 8, cursor: "pointer",
              color: "#c19748", fontSize: 13, fontWeight: 600,
              fontFamily: "sans-serif", letterSpacing: 1,
              transition: "border-color 0.15s",
            }}>⬆ Import Backup</button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  onImport(ev.target.result, loaded => setS(loaded));
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* ── Share Pricing Setup ── */}
        <div style={{ marginTop: 12, padding: "14px 16px", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
            Share Pricing Setup
          </div>
          <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 12, fontStyle: "italic" }}>
            Materials, tile types & services only — good for setting up someone else's phone. Doesn't include contractor info, estimates, or customers.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={exportPricingSetup} style={{
              flex: 1, padding: "11px 0",
              background: "#1a1610", border: "1px solid #3a3020",
              borderRadius: 8, cursor: "pointer",
              color: "#c19748", fontSize: 13, fontWeight: 600,
              fontFamily: "sans-serif", letterSpacing: 1,
            }}>⬇ Export</button>
            <button onClick={() => pricingImportRef.current?.click()} style={{
              flex: 1, padding: "11px 0",
              background: "#1a1610", border: "1px solid #3a3020",
              borderRadius: 8, cursor: "pointer",
              color: "#c19748", fontSize: 13, fontWeight: 600,
              fontFamily: "sans-serif", letterSpacing: 1,
            }}>⬆ Import</button>
            <input
              ref={pricingImportRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => startPricingImport(ev.target.result);
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {pricingReview && (
        <PricingImportReview
          review={pricingReview}
          onChoicesChange={choices => setPricingReview(p => ({ ...p, choices }))}
          onConfirm={applyPricingImport}
          onCancel={() => setPricingReview(null)}
        />
      )}
    </div>
  );
}

function PricingImportReview({ review, onChoicesChange, onConfirm, onCancel }) {
  const { consumablesDiff, tilesDiff, servicesDiff, choices } = review;
  const allConflicts = [
    ...consumablesDiff.conflicts.map(c => ({ ...c, type: "mat", label: "Material" })),
    ...tilesDiff.conflicts.map(c => ({ ...c, type: "tile", label: "Tile Type" })),
    ...servicesDiff.conflicts.map(c => ({ ...c, type: "svc", label: "Service" })),
  ];
  const totalIdentical = consumablesDiff.identicalCount + tilesDiff.identicalCount + servicesDiff.identicalCount;
  const totalNew = consumablesDiff.newItems.length + tilesDiff.newItems.length + servicesDiff.newItems.length;

  function setChoice(key, val) { onChoicesChange({ ...choices, [key]: val }); }
  function setAll(val) {
    const next = { ...choices };
    allConflicts.forEach(c => { next[c.key + ":" + c.type] = val; });
    onChoicesChange(next);
  }
  const allMine = allConflicts.every(c => choices[c.key + ":" + c.type] === "mine");
  const allImported = allConflicts.every(c => choices[c.key + ":" + c.type] === "imported");

  function conflictSummary(c) {
    if (c.type === "mat") return { mine: materialPriceLine(c.current), imported: materialPriceLine(c.imported) };
    if (c.type === "tile") return { mine: `$${nv(c.current.labor)}/sqft`, imported: `$${nv(c.imported.labor)}/sqft` };
    return { mine: `$${nv(c.current.laborPerSqFt)}/sqft, ${c.current.consumableIds.length} materials`, imported: `$${nv(c.imported.laborPerSqFt)}/sqft, ${c.imported.consumableIds.length} materials` };
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, background: "#1a1208", border: "1px solid #3a2e1a",
        borderRadius: 14, padding: 22, maxHeight: "88vh", overflowY: "auto", fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: 16, color: "#f5f0e8", fontWeight: 700, marginBottom: 4 }}>Review Import</div>
        <div style={{ fontSize: 12, color: "#5a4f38", marginBottom: 18, lineHeight: 1.5 }}>
          {totalIdentical} item{totalIdentical !== 1 ? "s" : ""} already match and won't change. {totalNew} new item{totalNew !== 1 ? "s" : ""} will be added. {allConflicts.length} item{allConflicts.length !== 1 ? "s" : ""} need a decision below.
        </div>

        {allConflicts.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setAll("mine")} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif",
                border: `1px solid ${allMine ? "#c19748" : "#2e2518"}`,
                background: allMine ? "rgba(193,151,72,0.13)" : "transparent",
                color: allMine ? "#c19748" : "#8a7d5e",
              }}>Keep Mine for All</button>
              <button onClick={() => setAll("imported")} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif",
                border: `1px solid ${allImported ? "#c19748" : "#2e2518"}`,
                background: allImported ? "rgba(193,151,72,0.13)" : "transparent",
                color: allImported ? "#c19748" : "#8a7d5e",
              }}>Use Imported for All</button>
            </div>
            <div style={{ fontSize: 10, color: "#5a4f38", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Needs Your Decision</div>
            {allConflicts.map(c => {
              const choiceKey = c.key + ":" + c.type;
              const choice = choices[choiceKey] || "mine";
              const summary = conflictSummary(c);
              return (
                <div key={choiceKey} style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 13.5, color: "#f5f0e8", fontWeight: 700, marginBottom: 2 }}>{c.current.name}</div>
                  <div style={{ fontSize: 10, color: "#5a4f38", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{c.label}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setChoice(choiceKey, "mine")} style={{
                      flex: 1, textAlign: "left", padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${choice === "mine" ? "#c19748" : "#2e2518"}`,
                      background: choice === "mine" ? "rgba(193,151,72,0.12)" : "transparent",
                    }}>
                      <div style={{ fontSize: 10, color: choice === "mine" ? "#c19748" : "#5a4f38", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                        {choice === "mine" && "✓ "}Keep Mine
                      </div>
                      <div style={{ fontSize: 12, color: "#8a7d5e" }}>{summary.mine}</div>
                    </button>
                    <button onClick={() => setChoice(choiceKey, "imported")} style={{
                      flex: 1, textAlign: "left", padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${choice === "imported" ? "#c19748" : "#2e2518"}`,
                      background: choice === "imported" ? "rgba(193,151,72,0.12)" : "transparent",
                    }}>
                      <div style={{ fontSize: 10, color: choice === "imported" ? "#c19748" : "#5a4f38", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                        {choice === "imported" && "✓ "}Use Imported
                      </div>
                      <div style={{ fontSize: 12, color: "#8a7d5e" }}>{summary.imported}</div>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 13, background: "transparent", border: "1px solid #2e2518",
            borderRadius: 8, color: "#8a7d5e", fontSize: 12, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", cursor: "pointer", fontFamily: "sans-serif",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 2, padding: 13, background: "linear-gradient(135deg, #c19748, #a07830)",
            border: "none", borderRadius: 8, color: "#0f0f0f", fontSize: 12, fontWeight: 700,
            letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "sans-serif",
          }}>Confirm Import</button>
        </div>
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
// ─── Customers Page ───────────────────────────────────────────────────────────
function CustomersPage({ customers, estimates, onSave, onDelete, onLoad, onMerge, onUpdate, onDeleteEstimate, onOpenShoppingList }) {
  const [search, setSearch]       = useState("");
  const [editing, setEditing]     = useState(null); // null | "new" | customer object
  const [form, setForm]           = useState({ name: "", email: "", phone: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [expandedEstId, setExpandedEstId] = useState(null);
  const [mergingId, setMergingId] = useState(null); // customer id currently choosing a merge target
  const [mergeTargetId, setMergeTargetId] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(c => (c.name||"").toLowerCase().includes(q) || (c.email||"").toLowerCase().includes(q) || (c.phone||"").toLowerCase().includes(q))
    : customers;

  const selectedCustomer = customers.find(c => c.id === selectedId);
  const customerEstimates = selectedId
    ? estimates.filter(e => e.customerName && selectedCustomer && e.customerName === selectedCustomer.name)
    : [];

  const fmtPrice = v => "$" + Number(v||0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function startEdit(customer) {
    setForm({ name: customer.name||"", email: customer.email||"", phone: customer.phone||"" });
    setEditing(customer);
  }
  function startNew() {
    setForm({ name: "", email: "", phone: "" });
    setEditing("new");
    setSelectedId(null);
  }
  function cancelEdit() { setEditing(null); }
  function handleSave() {
    if (!form.name.trim()) { alert("Customer name is required."); return; }
    const record = editing === "new"
      ? { id: null, ...form }
      : { ...editing, ...form };
    onSave(record).then(saved => {
      setEditing(null);
      setSelectedId(saved.id);
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>

      {/* Edit / New form */}
      {editing && (
        <div style={{ background: "#13110d", border: "1px solid #c19748", borderRadius: 8, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700, marginBottom: 14 }}>
            {editing === "new" ? "New Customer" : "Edit Customer"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[["name","Name","Jane Smith",true],["email","Email","jane@email.com",false],["phone","Phone","(555) 123-4567",false]].map(([key, label, ph, required]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}{required && " *"}</div>
                <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={ph} style={iStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleSave} style={{
              flex: 1, padding: "10px", background: "linear-gradient(135deg,#c19748,#a07830)",
              border: "none", borderRadius: 6, cursor: "pointer", color: "#0f0f0f",
              fontSize: 13, fontWeight: 700, fontFamily: "sans-serif",
            }}>Save Customer</button>
            <button onClick={cancelEdit} style={{
              padding: "10px 16px", background: "none", border: "1px solid #2e2518",
              borderRadius: 6, cursor: "pointer", color: "#6b5f4a", fontSize: 13, fontFamily: "sans-serif",
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search + add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "8px 12px" }}>
          <span style={{ color: "#4a4030", fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            style={{ background: "transparent", border: "none", outline: "none", color: "#d4c49a", fontFamily: "sans-serif", fontSize: 13, flex: 1 }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#5a4f38", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>}
        </div>
        <button onClick={startNew} style={{
          padding: "8px 16px", background: "linear-gradient(135deg,#c19748,#a07830)",
          border: "none", borderRadius: 8, cursor: "pointer", color: "#0f0f0f",
          fontSize: 13, fontWeight: 700, fontFamily: "sans-serif", whiteSpace: "nowrap",
        }}>+ Add</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a3020", fontFamily: "sans-serif" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 14 }}>{q ? "No customers match your search." : "No customers yet."}</div>
          {!q && <div style={{ fontSize: 12, marginTop: 6, color: "#2e2518" }}>Add your first customer with the + Add button above.</div>}
        </div>
      ) : filtered.map(c => (
        <div key={c.id}>
          <div onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
            style={{ background: selectedId === c.id ? "#1a1710" : "#13110d", border: `1px solid ${selectedId === c.id ? "#c19748" : "#2e2518"}`, borderRadius: selectedId === c.id ? "8px 8px 0 0" : 8, padding: "14px 16px", marginBottom: selectedId === c.id ? 0 : 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{c.name}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                {c.email && <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{c.email}</span>}
                {c.phone && <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{c.phone}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={e2 => { e2.stopPropagation(); startEdit(c); }} style={{ background: "none", border: "1px solid #2e2518", borderRadius: 5, padding: "5px 10px", cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif" }}>Edit</button>
              <button onClick={e2 => { e2.stopPropagation(); if (window.confirm(`Delete ${c.name}?`)) onDelete(c.id); }} style={{ background: "none", border: "1px solid #3a2518", borderRadius: 5, padding: "5px 10px", cursor: "pointer", color: "#6b5f4a", fontSize: 11, fontFamily: "sans-serif" }}>✕</button>
            </div>
            <span style={{ color: "#3a3020", fontSize: 12 }}>{selectedId === c.id ? "▲" : "▼"}</span>
          </div>

          {/* Customer estimate history */}
          {selectedId === c.id && (
            <div style={{ background: "#0f0d0a", border: "1px solid #c19748", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                  Estimate History
                </div>
                {customers.length > 1 && (
                  <button onClick={e2 => { e2.stopPropagation(); setMergingId(mergingId === c.id ? null : c.id); setMergeTargetId(""); }} style={{
                    background: "none", border: "1px solid #2e2518", borderRadius: 5, padding: "4px 9px",
                    cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif",
                  }}>⇄ Merge</button>
                )}
              </div>

              {mergingId === c.id && (
                <div style={{ background: "#13110d", border: "1px solid #3a2e1a", borderRadius: 6, padding: "10px 12px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif", marginBottom: 8 }}>
                    Merge <strong style={{ color: "#d4c49a" }}>{c.name}</strong> into another customer — all of their estimates move to that customer, and this record is removed. Can't be undone.
                  </div>
                  <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)}
                    style={{ ...iStyle, cursor: "pointer", marginBottom: 8 }}>
                    <option value="">— Merge into… —</option>
                    {customers.filter(o => o.id !== c.id).map(o => (
                      <option key={o.id} value={o.id}>{o.name}{o.phone ? "  •  " + o.phone : ""}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={!mergeTargetId} onClick={() => {
                      const target = customers.find(o => o.id === mergeTargetId);
                      if (!target) return;
                      if (window.confirm(`Merge "${c.name}" into "${target.name}"? This can't be undone.`)) {
                        onMerge(c.id, mergeTargetId);
                        setMergingId(null); setMergeTargetId("");
                        setSelectedId(mergeTargetId);
                      }
                    }} style={{
                      flex: 1, padding: "8px", background: mergeTargetId ? "linear-gradient(135deg,#c19748,#a07830)" : "#2e2518",
                      border: "none", borderRadius: 6, cursor: mergeTargetId ? "pointer" : "not-allowed",
                      color: mergeTargetId ? "#0f0f0f" : "#5a4f38", fontSize: 12, fontWeight: 700, fontFamily: "sans-serif",
                    }}>Confirm Merge</button>
                    <button onClick={() => { setMergingId(null); setMergeTargetId(""); }} style={{
                      padding: "8px 14px", background: "none", border: "1px solid #2e2518",
                      borderRadius: 6, cursor: "pointer", color: "#6b5f4a", fontSize: 12, fontFamily: "sans-serif",
                    }}>Cancel</button>
                  </div>
                </div>
              )}
              {customerEstimates.length === 0 ? (
                <div style={{ fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", fontStyle: "italic" }}>No estimates sent to this customer yet.</div>
              ) : customerEstimates.map(e => {
                const isExpanded = expandedEstId === e.id;
                const jStatus = jobStatusOf(e);
                return (
                  <div key={e.id} style={{ borderBottom: "1px solid #1e1a12" }}>
                    <div onClick={() => setExpandedEstId(isExpanded ? null : e.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", cursor: "pointer" }}>
                      <div>
                        <span style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700, marginRight: 8 }}>#{e.estNum}</span>
                        <span style={{ fontSize: 12, color: "#8a7d65", fontFamily: "sans-serif" }}>{e.projectDesc || e.tileName}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: jStatus.color, background: jStatus.color + "1a", border: `1px solid ${jStatus.color}40`, borderRadius: 10, padding: "1px 7px", fontFamily: "sans-serif", marginLeft: 8 }}>
                          {jStatus.icon} {jStatus.label}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#e8c870", fontFamily: "sans-serif" }}>{fmtPrice(e.totalPrice)}</div>
                          <div style={{ fontSize: 10, color: "#3a3020", fontFamily: "sans-serif" }}>{e.date}</div>
                        </div>
                        <span style={{ color: "#3a3020", fontSize: 11 }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <EstimateExpandedDetail record={e} onUpdate={onUpdate} onLoad={onLoad} onDelete={onDeleteEstimate} onOpenShoppingList={onOpenShoppingList} />
                    )}
                  </div>
                );
              })}
              {customerEstimates.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{customerEstimates.length} estimate{customerEstimates.length !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: 13, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700 }}>
                    Total: {fmtPrice(customerEstimates.reduce((s, e) => s + (e.totalPrice||0), 0))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
// ─── Date helpers for Accounting tab ──────────────────────────────────────
function startOfDay(d)   { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d)  { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function startOfQuarter(d){ const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); }
function startOfYear(d)  { return new Date(d.getFullYear(), 0, 1); }

function getPeriodRange(type, anchor) {
  switch (type) {
    case "day": {
      const start = startOfDay(anchor), end = addDays(start, 1);
      return { start, end, label: start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) };
    }
    case "week": {
      const start = startOfWeek(anchor), end = addDays(start, 7);
      const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(start, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      return { start, end, label };
    }
    case "month": {
      const start = startOfMonth(anchor), end = addMonths(start, 1);
      return { start, end, label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
    }
    case "quarter": {
      const start = startOfQuarter(anchor), end = addMonths(start, 3);
      return { start, end, label: `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}` };
    }
    case "year": {
      const start = startOfYear(anchor), end = new Date(start.getFullYear() + 1, 0, 1);
      return { start, end, label: `${start.getFullYear()}` };
    }
    default: return getPeriodRange("month", anchor);
  }
}
function shiftAnchor(type, anchor, dir) {
  switch (type) {
    case "day":     return addDays(anchor, dir);
    case "week":    return addDays(anchor, dir * 7);
    case "month":   return addMonths(anchor, dir);
    case "quarter": return addMonths(anchor, dir * 3);
    case "year":    return new Date(anchor.getFullYear() + dir, anchor.getMonth(), 1);
    default: return anchor;
  }
}
function getSubBuckets(type, start, end) {
  if (type === "day") return null;
  if (type === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const s = addDays(start, i);
      return { label: s.toLocaleDateString("en-US", { weekday: "short" })[0], start: s, end: addDays(s, 1) };
    });
  }
  const buckets = [];
  let cur = start, idx = 1;
  while (cur < end) {
    let e, label;
    if (type === "month") { e = new Date(Math.min(addDays(cur, 7).getTime(), end.getTime())); label = `W${idx}`; idx++; }
    else { e = addMonths(cur, 1); label = cur.toLocaleDateString("en-US", { month: "narrow" }); }
    buckets.push({ label, start: cur, end: e });
    cur = e;
  }
  return buckets;
}

function AccountingPage({ estimateHistory, onUpdate, onLoad, onDelete, onOpenShoppingList }) {
  const [periodType, setPeriodType] = useState("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fmt = v => "$" + Math.round(Number(v || 0)).toLocaleString("en-US");
  const range = getPeriodRange(periodType, anchor);
  const prevAnchor = shiftAnchor(periodType, anchor, -1);
  const prevRange = getPeriodRange(periodType, prevAnchor);

  const inRange = (rec, r) => {
    const d = new Date(rec.dateISO || rec.date);
    return d >= r.start && d < r.end;
  };

  const all = (estimateHistory || []).filter(r => r.jobStatus === "complete");
  const inPeriod = all.filter(r => inRange(r, range));
  const withData = inPeriod.filter(r => r.trueCost != null);
  const missingCount = inPeriod.length - withData.length;

  const q = search.trim().toLowerCase();
  const allInPeriod = (estimateHistory || []).filter(r => inRange(r, range));
  const visible = allInPeriod.filter(r => !q ||
    (r.customerName || "").toLowerCase().includes(q) ||
    (r.projectDesc || "").toLowerCase().includes(q)
  ).sort((a, b) => new Date(b.dateISO || b.date) - new Date(a.dateISO || a.date));

  const totalCharged = withData.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const totalCost    = withData.reduce((s, r) => s + (r.trueCost || 0), 0);
  const totalProfit  = totalCharged - totalCost;
  const avgMargin    = totalCharged > 0 ? (totalProfit / totalCharged) * 100 : 0;

  const prevWithData = all.filter(r => inRange(r, prevRange) && r.trueCost != null);
  const prevProfit = prevWithData.reduce((s, r) => s + ((r.totalPrice || 0) - (r.trueCost || 0)), 0);
  const hasPrevData = prevWithData.length > 0;
  const deltaPct = hasPrevData && prevProfit !== 0 ? ((totalProfit - prevProfit) / Math.abs(prevProfit)) * 100 : null;

  // Missed Opportunity — sent estimates in this period that haven't been marked Complete
  // (still Awaiting Approval, Approved but not yet done, or Declined). Represents potential
  // revenue that hasn't (or won't) come in yet.
  const uncompleted = (estimateHistory || []).filter(r => r.jobStatus !== "complete" && inRange(r, range));
  const missedOpportunity = uncompleted.reduce((s, r) => s + (r.totalPrice || 0), 0);

  const periodNoun = { day: "day", week: "week", month: "month", quarter: "quarter", year: "year" }[periodType];
  const buckets = getSubBuckets(periodType, range.start, range.end);
  const bucketProfits = buckets ? buckets.map(b => withData.reduce((s, r) => inRange(r, b) ? s + ((r.totalPrice || 0) - (r.trueCost || 0)) : s, 0)) : [];
  const maxAbs = bucketProfits.length ? Math.max(1, ...bucketProfits.map(v => Math.abs(v))) : 1;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 90px" }}>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "#f0ede6", marginBottom: 4 }}>Accounting</div>
      <div style={{ fontSize: 12, color: "#6b5f4a", fontFamily: "sans-serif", marginBottom: 18 }}>Profit &amp; expense summary across jobs marked Complete</div>

      {/* Period type tabs */}
      <div style={{ display: "flex", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        {["day", "week", "month", "quarter", "year"].map(t => (
          <div key={t} onClick={() => setPeriodType(t)} style={{
            flex: 1, textAlign: "center", padding: "9px 4px", fontSize: 11, fontWeight: 600,
            letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer", fontFamily: "sans-serif",
            color: periodType === t ? "#c19748" : "#5a4f38",
            background: periodType === t ? "#1a1710" : "transparent",
            borderBottom: periodType === t ? "2px solid #c19748" : "2px solid transparent",
          }}>{t}</div>
        ))}
      </div>

      {/* Period navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "10px 14px", marginBottom: 18 }}>
        <span onClick={() => setAnchor(shiftAnchor(periodType, anchor, -1))} style={{ color: "#6b5f4a", fontSize: 15, cursor: "pointer", padding: "4px 8px" }}>‹</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#d4c49a", fontFamily: "sans-serif" }}>{range.label}</span>
        <span onClick={() => setAnchor(shiftAnchor(periodType, anchor, 1))} style={{ color: "#6b5f4a", fontSize: 15, cursor: "pointer", padding: "4px 8px" }}>›</span>
      </div>

      {/* Profit hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(109,196,122,0.10), rgba(19,17,13,0.4))",
        border: `1px solid ${totalProfit >= 0 ? "#2e4a2e" : "#4a2e2e"}`, borderRadius: 10,
        padding: "18px 16px", textAlign: "center", marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: "#6b8a6b", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif", marginBottom: 6 }}>
          Net Profit This {periodNoun.charAt(0).toUpperCase() + periodNoun.slice(1)}
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "sans-serif", color: totalProfit >= 0 ? "#6dc47a" : "#c15b48" }}>{fmt(totalProfit)}</div>
        {deltaPct != null && (
          <div style={{ fontSize: 11, color: deltaPct >= 0 ? "#5a7a5a" : "#8a5a5a", marginTop: 4, fontFamily: "sans-serif" }}>
            {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(0)}% vs. last {periodNoun}
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {[
          ["Total Charged", fmt(totalCharged), "#e8c870"],
          ["Total Expense", fmt(totalCost), "#c8b98a"],
          ["Avg Margin", avgMargin.toFixed(0) + "%", avgMargin >= 0 ? "#6dc47a" : "#c15b48"],
          ["Jobs Completed", String(withData.length), "#c8b98a"],
          ["Missed Opportunity", fmt(missedOpportunity), "#c15b48"],
          ["Uncompleted Jobs", String(uncompleted.length), "#c15b48"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, color: "#5a4f38", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "sans-serif", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "sans-serif", color }}>{val}</div>
          </div>
        ))}
      </div>

      {missingCount > 0 && (
        <div style={{ fontSize: 11, color: "#6b5f4a", fontFamily: "sans-serif", marginBottom: 14, fontStyle: "italic" }}>
          {missingCount} estimate{missingCount !== 1 ? "s" : ""} in this period {missingCount !== 1 ? "were" : "was"} saved before profit tracking and {missingCount !== 1 ? "are" : "is"} excluded from these totals.
        </div>
      )}

      {/* Chart */}
      {buckets && (
        <>
          <div style={{ fontSize: 11, color: "#8a7d5e", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif", fontWeight: 600, marginBottom: 10 }}>Profit by {periodType === "week" ? "Day" : periodType === "month" ? "Week" : "Month"}</div>
          <div style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "16px 12px 10px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginBottom: 8 }}>
              {bucketProfits.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{
                    width: "100%", borderRadius: "3px 3px 0 0",
                    background: v === 0 ? "#2e2518" : v > 0 ? "#6dc47a" : "#c15b48",
                    height: `${Math.max(4, (Math.abs(v) / maxAbs) * 100)}%`,
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {buckets.map((b, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: "#5a4f38", fontFamily: "sans-serif" }}>{b.label}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <span style={{ color: "#4a4030", fontSize: 13 }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs in this period…"
          style={{ background: "transparent", border: "none", outline: "none", color: "#d4c49a", fontSize: 13, flex: 1, fontFamily: "sans-serif" }} />
      </div>

      {/* Job lists */}
      {(() => {
        const missedVisible = visible.filter(r => (r.jobStatus || "awaiting") !== "complete");
        const completedVisible = visible.filter(r => (r.jobStatus || "awaiting") === "complete");

        const renderJobRow = r => {
          const p = (r.totalPrice || 0) - (r.trueCost || 0);
          const st = jobStatusOf(r);
          const isComplete = (r.jobStatus || "awaiting") === "complete";
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} style={{ background: "#13110d", border: `1px solid ${isExpanded ? "#6dc47a" : "#2e2518"}`, borderRadius: 8, marginBottom: 8, overflow: "hidden", transition: "border-color 0.15s" }}>
              <div onClick={() => setExpandedId(isExpanded ? null : r.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, color: "#d4c49a", fontWeight: 600, fontFamily: "sans-serif" }}>{r.customerName || "Unnamed customer"}</span>
                    {isComplete && <span title="Locked — completed jobs can't be edited" style={{ fontSize: 11 }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{r.date}{r.projectDesc ? ` · ${r.projectDesc}` : ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontSize: 13, color: "#e8c870", fontWeight: 600, fontFamily: "sans-serif" }}>{fmt(r.totalPrice)}</div>
                  {r.trueCost != null ? (
                    <div style={{ fontSize: 11, color: p >= 0 ? "#6dc47a" : "#c15b48", marginTop: 2, fontFamily: "sans-serif" }}>{p >= 0 ? "+" : ""}{fmt(p)} profit</div>
                  ) : (
                    <div style={{ fontSize: 10, color: st.color, marginTop: 2, fontFamily: "sans-serif" }}>{st.icon} {st.label}</div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <EstimateExpandedDetail record={r} onUpdate={onUpdate} onLoad={onLoad} onDelete={onDelete} onOpenShoppingList={onOpenShoppingList} />
              )}
            </div>
          );
        };

        return (
          <>
            <div style={{ fontSize: 11, color: "#c15b48", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif", fontWeight: 600, marginBottom: 10 }}>
              Missed Opportunities — This {periodNoun.charAt(0).toUpperCase() + periodNoun.slice(1)} ({missedVisible.length})
            </div>
            {missedVisible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#5a4f38", fontFamily: "sans-serif", fontSize: 13, marginBottom: 18 }}>
                No uncompleted jobs {q ? "match your search" : "in this period"}.
              </div>
            ) : <div style={{ marginBottom: 18 }}>{missedVisible.map(renderJobRow)}</div>}

            <div style={{ fontSize: 11, color: "#8a7d5e", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif", fontWeight: 600, marginBottom: 10 }}>
              Completed Jobs — This {periodNoun.charAt(0).toUpperCase() + periodNoun.slice(1)} ({completedVisible.length})
            </div>
            {completedVisible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#5a4f38", fontFamily: "sans-serif", fontSize: 13 }}>
                No completed jobs {q ? "match your search" : "in this period"}.
              </div>
            ) : completedVisible.map(renderJobRow)}
          </>
        );
      })()}
    </div>
  );
}

function HistoryPage({ estimateHistory, drafts, customers, settings, shoppingListsById, onOpenShoppingList, onClear, onUpdate, onDelete, onLoad, onDeleteDraft, onLoadDraft, onSendDraft }) {
  const [view, setView]         = useState("open");
  const [search, setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [sendingDraftId, setSendingDraftId] = useState(null);
  const [draftSendMode, setDraftSendMode]   = useState("email");

  const fmt = v => "$" + Number(v||0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const q = search.trim().toLowerCase();
  const openJobs = estimateHistory.filter(e => (e.jobStatus || "awaiting") !== "complete");
  const completedJobs = estimateHistory.filter(e => (e.jobStatus || "awaiting") === "complete");
  const baseList = view === "open" ? openJobs : view === "completed" ? completedJobs : (drafts || []);
  const filtered = baseList.filter(e =>
    !q ||
    (e.customerName||"").toLowerCase().includes(q) ||
    (e.projectDesc||"").toLowerCase().includes(q) ||
    (e.tileName||"").toLowerCase().includes(q)
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>

      {/* Open / Completed / Drafts toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 8, overflow: "hidden" }}>
        {[["open", `Open (${openJobs.length})`], ["completed", `Completed (${completedJobs.length})`], ["drafts", `Drafts (${(drafts||[]).length})`]].map(([key, label]) => (
          <button key={key} onClick={() => { setView(key); setSearch(""); setExpandedId(null); }} style={{
            flex: 1, padding: "10px", border: "none", cursor: "pointer", fontFamily: "sans-serif",
            fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
            background: view === key ? "#1a1710" : "transparent",
            color: view === key ? "#c19748" : "#5a4f38",
            borderBottom: view === key ? "2px solid #c19748" : "2px solid transparent",
            transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
        <span style={{ color: "#4a4030", fontSize: 14 }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${view === "drafts" ? "drafts" : view === "completed" ? "completed jobs" : "open jobs"}…`}
          style={{ background: "transparent", border: "none", outline: "none", color: "#d4c49a", fontFamily: "sans-serif", fontSize: 13, flex: 1 }} />
        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#5a4f38", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif" }}>
          {filtered.length} {view === "drafts" ? "draft" : "job"}{filtered.length !== 1 ? "s" : ""}
        </div>
        {(view === "open" || view === "completed") && estimateHistory.length > 0 && (
          <button onClick={() => { if (window.confirm("Clear all sent estimate history?")) onClear(); }}
            style={{ background: "none", border: "1px solid #3a2518", borderRadius: 6, color: "#6b5f4a", fontSize: 11, padding: "5px 10px", cursor: "pointer", fontFamily: "sans-serif" }}>
            Clear History
          </button>
        )}
      </div>

      {/* Totals across currently filtered sent estimates that have profit data */}
      {(view === "open" || view === "completed") && filtered.some(e => e.trueCost != null) && (() => {
        const withData = filtered.filter(e => e.trueCost != null);
        const totalCharged = withData.reduce((s, e) => s + (e.totalPrice || 0), 0);
        const totalCost    = withData.reduce((s, e) => s + (e.trueCost || 0), 0);
        const totalProfit  = totalCharged - totalCost;
        const avgMargin    = totalCharged > 0 ? (totalProfit / totalCharged) * 100 : 0;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              ["Total Charged", fmt(totalCharged), "#e8c870"],
              ["Total Cost", fmt(totalCost), "#c8b98a"],
              ["Total Profit", fmt(totalProfit), totalProfit >= 0 ? "#6dc47a" : "#c15b48"],
              ["Avg Margin", avgMargin.toFixed(0) + "%", avgMargin >= 0 ? "#6dc47a" : "#c15b48"],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color, fontFamily: "sans-serif", fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a3020", fontFamily: "sans-serif" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{view === "drafts" ? "💾" : view === "completed" ? "🏁" : "📋"}</div>
          <div style={{ fontSize: 14 }}>{q ? "No results match your search." : view === "drafts" ? "No drafts saved yet." : view === "completed" ? "No completed jobs yet." : "No open jobs."}</div>
          {!q && view === "drafts" && <div style={{ fontSize: 12, marginTop: 6, color: "#2e2518" }}>After calculating, tap 💾 Save Draft to save here.</div>}
        </div>
      ) : view === "drafts" ? filtered.map(d => {
        const isExpanded = expandedId === d.id;
        const isSending = sendingDraftId === d.id;
        return (
          <div key={d.id} style={{ background: "#13110d", border: `1px solid ${isExpanded ? "#6dc47a" : "#2e2518"}`, borderRadius: 8, marginBottom: 10, overflow: "hidden", transition: "border-color 0.15s" }}>
            <div onClick={() => setExpandedId(isExpanded ? null : d.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#6dc47a", fontFamily: "sans-serif", fontWeight: 700, flexShrink: 0 }}>{d.draftNum}</span>
                  <span style={{ fontSize: 13, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{d.customerName || "No customer"}</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {d.projectDesc && <span style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif" }}>{d.projectDesc}</span>}
                  <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{d.tileName}{d.sqft ? " · " + d.sqft + " sqft" : ""}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, color: "#e8c870", fontFamily: "sans-serif", fontWeight: 600 }}>{fmt(d.totalPrice)}</div>
                <div style={{ fontSize: 11, color: "#3a3020", fontFamily: "sans-serif", marginTop: 2 }}>{d.date}</div>
              </div>
              <span style={{ color: "#3a3020", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
            </div>
            {isExpanded && (
              <div style={{ borderTop: "1px solid #2e2518" }}>
                <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#0f0d0a" }}>
                  <button onClick={e2 => { e2.stopPropagation(); setSendingDraftId(isSending ? null : d.id); }} style={{
                    flex: 1, padding: "8px", background: "#1a1610", border: "1px solid #c19748",
                    borderRadius: 6, cursor: "pointer", color: "#c19748", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
                  }}>{isSending ? "✕ Cancel" : "✉ Send"}</button>
                  <button onClick={e2 => { e2.stopPropagation(); onLoadDraft(d); }} style={{
                    flex: 1, padding: "8px", background: "#1a1610", border: "1px solid #3a2e1a",
                    borderRadius: 6, cursor: "pointer", color: "#6dc47a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
                  }}>↑ Load & Edit</button>
                  <button onClick={e2 => { e2.stopPropagation(); onOpenShoppingList(d); }} style={{
                    flex: 1, padding: "8px", background: "#1a1610", border: "1px solid #3a2e1a",
                    borderRadius: 6, cursor: "pointer", color: "#c19748", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
                  }}>🛒 List</button>
                  <button onClick={e2 => { e2.stopPropagation(); if (window.confirm("Delete this draft?")) onDeleteDraft(d.id); }} style={{
                    padding: "8px 12px", background: "none", border: "1px solid #3a2518",
                    borderRadius: 6, cursor: "pointer", color: "#6b5f4a", fontSize: 12, fontFamily: "sans-serif",
                  }}>✕</button>
                </div>
                {isSending && (
                  <div style={{ padding: "0 16px 16px", background: "#0f0d0a" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      {["email", "text"].map(mode => (
                        <button key={mode} onClick={() => setDraftSendMode(mode)} style={{
                          flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer",
                          border: `1px solid ${draftSendMode === mode ? "#c19748" : "#2e2518"}`,
                          background: draftSendMode === mode ? "#1e1a10" : "#13110d",
                          color: draftSendMode === mode ? "#c19748" : "#5a4f38",
                          fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
                        }}>{mode === "email" ? "✉ Email" : "💬 Text"}</button>
                      ))}
                    </div>
                    <button onClick={() => {
                      const subject = "Tile Installation Estimate" + (d.customerName ? " — " + d.customerName : "");
                      const body = `${d.customerName ? "Hi " + d.customerName.split(" ")[0] + ",\n\n" : ""}Here is your tile installation estimate for ${d.sqft} sqft${d.projectDesc ? " — " + d.projectDesc : ""}.\n\nTotal: ${fmt(d.totalPrice)}\n\n${settings?.contractor?.contactName || ""}\n${settings?.contractor?.phone || ""}`;
                      if (draftSendMode === "email") {
                        const to = d.customerEmail ? encodeURIComponent(d.customerEmail) : "";
                        window.open("mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body));
                      } else {
                        const to = d.customerPhone ? d.customerPhone.replace(/\D/g, "") : "";
                        window.open("sms:" + (to ? "+" + to : "") + "?&body=" + encodeURIComponent(body));
                      }
                      onSendDraft(d, draftSendMode === "email" ? body : "", draftSendMode === "text" ? body : "");
                      setSendingDraftId(null); setExpandedId(null);
                    }} style={{
                      width: "100%", padding: "10px", background: "#1e1608",
                      border: "1px solid #c19748", borderRadius: 6, cursor: "pointer",
                      color: "#c19748", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700,
                    }}>{draftSendMode === "email" ? "Open in Mail App →" : "Open in Messages App →"}</button>
                  </div>
                )}
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Draft Details</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {d.customerEmail && <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{d.customerEmail}</span>}
                    {d.customerPhone && <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{d.customerPhone}</span>}
                    <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{d.sqft} sqft · {d.tileName}</span>
                    {d.jobNotes && <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", fontStyle: "italic" }}>{d.jobNotes}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }) : filtered.map(e => {
        const isExpanded = expandedId === e.id;
        const jStatus = jobStatusOf(e);
        const mStatus = materialsStatusOf(e, settings, shoppingListsById[e.id]);
        return (
          <div key={e.id} style={{ background: "#13110d", border: `1px solid ${isExpanded ? "#c19748" : "#2e2518"}`, borderRadius: 8, marginBottom: 10, overflow: "hidden", transition: "border-color 0.15s" }}>
            {/* Summary row */}
            <div onClick={() => setExpandedId(isExpanded ? null : e.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700, flexShrink: 0 }}>#{e.estNum}</span>
                  <span style={{ fontSize: 13, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.customerName || "No customer name"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: jStatus.color, background: jStatus.color + "1a", border: `1px solid ${jStatus.color}40`, borderRadius: 10, padding: "2px 8px", fontFamily: "sans-serif" }}>
                    {jStatus.icon} {jStatus.label}
                  </span>
                  {mStatus && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: mStatus.color, background: mStatus.color + "1a", border: `1px solid ${mStatus.color}40`, borderRadius: 10, padding: "2px 8px", fontFamily: "sans-serif" }}>
                      {mStatus.icon} {mStatus.label}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {e.projectDesc && <span style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif" }}>{e.projectDesc}</span>}
                  <span style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{e.tileName}{e.sqft ? " · " + e.sqft + " sqft" : ""}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, color: "#e8c870", fontFamily: "sans-serif", fontWeight: 600 }}>{fmt(e.totalPrice)}</div>
                <div style={{ fontSize: 11, color: "#3a3020", fontFamily: "sans-serif", marginTop: 2 }}>{e.date}</div>
              </div>
              <div style={{ color: "#3a3020", fontSize: 12, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</div>
            </div>

            {isExpanded && (
              <EstimateExpandedDetail record={e} onUpdate={onUpdate} onLoad={onLoad} onDelete={onDelete} onOpenShoppingList={onOpenShoppingList} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shopping List Modal ───────────────────────────────────────────────────────
function ShoppingListModal({ estimate, settings, onClose }) {
  const listId = "sl_" + estimate.id;
  const autoItems = buildShoppingListItems(estimate, settings);
  const [checked, setChecked]         = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [loaded, setLoaded]           = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [newItem, setNewItem]         = useState({ name: "", qty: "1", cost: "" });

  const fmt = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    let cancelled = false;
    dbGet("shoppingLists", listId).then(rec => {
      if (cancelled) return;
      if (rec) {
        setChecked(rec.checked || {});
        setCustomItems(rec.customItems || []);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [listId]);

  function persist(nextChecked, nextCustomItems) {
    dbPut("shoppingLists", {
      id: listId,
      estimateId: estimate.id,
      checked: nextChecked,
      customItems: nextCustomItems,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  function toggleItem(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      persist(next, customItems);
      return next;
    });
  }

  function addCustomItem() {
    if (!newItem.name.trim()) return;
    const item = { id: "c_" + uid(), name: newItem.name.trim(), qty: nv(newItem.qty, 1), cost: nv(newItem.cost, 0) };
    const next = [...customItems, item];
    setCustomItems(next);
    persist(checked, next);
    setNewItem({ name: "", qty: "1", cost: "" });
    setShowAdd(false);
  }

  function deleteCustomItem(id) {
    const next = customItems.filter(i => i.id !== id);
    setCustomItems(next);
    persist(checked, next);
  }

  const allItems = [...autoItems, ...customItems.map(i => ({ ...i, unitLabel: "", note: "custom" }))];
  const totalCost = allItems.reduce((s, i) => s + (i.cost || 0), 0);
  const remainingCost = allItems.reduce((s, i) => s + (checked[i.id] ? 0 : (i.cost || 0)), 0);
  const purchasedCount = allItems.filter(i => checked[i.id]).length;

  function exportList() {
    const stamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const label = estimate.estNum ? "Estimate #" + estimate.estNum : (estimate.draftNum || "Job");
    let text = `SHOPPING LIST — ${label}\n`;
    text += `${estimate.customerName ? "Customer: " + estimate.customerName + "\n" : ""}`;
    text += `${estimate.projectDesc ? "Project: " + estimate.projectDesc + "\n" : ""}`;
    text += `Generated: ${stamp}\n\n`;
    allItems.forEach(i => {
      const box = checked[i.id] ? "[x]" : "[ ]";
      const qtyStr = i.unitLabel ? `${i.qty} ${i.unitLabel}` : `x${i.qty}`;
      text += `${box} ${i.name} — ${qtyStr} — ${fmt(i.cost)}${i.note && i.note !== "custom" ? " (" + i.note + ")" : ""}\n`;
    });
    text += `\nTOTAL: ${fmt(totalCost)}\nREMAINING TO BUY: ${fmt(remainingCost)}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `shopping-list-${(estimate.estNum || estimate.draftNum || "job").replace(/\W+/g, "-")}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "1px solid #1e1a12" };
  const iStyle = { width: "100%", padding: "8px 10px", background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, color: "#d4c49a", fontSize: 13, fontFamily: "sans-serif", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#1a1208", border: "1px solid #3a2e1a", borderRadius: 14, padding: 20, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, color: "#f5f0e8", fontWeight: 700, fontFamily: "sans-serif" }}>🛒 Shopping List</div>
            <div style={{ fontSize: 12, color: "#8a7d65", fontFamily: "sans-serif", marginTop: 2 }}>
              {estimate.customerName || "No customer"}{estimate.estNum ? " · #" + estimate.estNum : estimate.draftNum ? " · " + estimate.draftNum : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7d5e", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#5a4f38", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif" }}>Total Cost</div>
            <div style={{ fontSize: 17, color: "#e8c870", fontWeight: 700, fontFamily: "sans-serif" }}>{fmt(totalCost)}</div>
          </div>
          <div style={{ flex: 1, background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#5a4f38", textTransform: "uppercase", letterSpacing: 1, fontFamily: "sans-serif" }}>Still Need</div>
            <div style={{ fontSize: 17, color: remainingCost > 0 ? "#c19748" : "#6dc47a", fontWeight: 700, fontFamily: "sans-serif" }}>{fmt(remainingCost)}</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 6 }}>
          {purchasedCount}/{allItems.length} picked up
        </div>

        <div style={{ overflowY: "auto", flex: 1, marginBottom: 12 }}>
          {!loaded ? (
            <div style={{ padding: 20, textAlign: "center", color: "#5a4f38", fontFamily: "sans-serif", fontSize: 12 }}>Loading…</div>
          ) : allItems.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#5a4f38", fontFamily: "sans-serif", fontSize: 12 }}>No materials on this job yet.</div>
          ) : allItems.map(i => (
            <div key={i.id} style={rowStyle}>
              <Checkbox checked={!!checked[i.id]} onClick={() => toggleItem(i.id)} />
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleItem(i.id)}>
                <div style={{ fontSize: 13, color: checked[i.id] ? "#5a4f38" : "#d4c49a", fontFamily: "sans-serif", fontWeight: 600, textDecoration: checked[i.id] ? "line-through" : "none" }}>
                  {i.name}{i.note === "custom" && <span style={{ fontSize: 10, color: "#8a7d5e", marginLeft: 6 }}>(custom)</span>}
                </div>
                <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>
                  {i.unitLabel ? `${i.qty} ${i.unitLabel}` : `× ${i.qty}`}{i.note && i.note !== "custom" ? " · " + i.note : ""}
                </div>
              </div>
              <div style={{ fontSize: 13, color: checked[i.id] ? "#5a4f38" : "#c19748", fontFamily: "sans-serif", fontWeight: 600, flexShrink: 0 }}>{fmt(i.cost)}</div>
              {i.materialId === undefined && (
                <button onClick={() => deleteCustomItem(i.id)} style={{ background: "none", border: "none", color: "#6b5f4a", fontSize: 14, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>

        {showAdd ? (
          <div style={{ background: "#13110d", border: "1px solid #2e2518", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
              <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="Item name (e.g. Extra corner trim)" style={iStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newItem.qty} onChange={e => setNewItem(p => ({ ...p, qty: e.target.value }))} placeholder="Qty" type="number" style={iStyle} />
                <input value={newItem.cost} onChange={e => setNewItem(p => ({ ...p, cost: e.target.value }))} placeholder="Cost $" type="number" style={iStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 9, background: "none", border: "1px solid #2e2518", borderRadius: 6, color: "#8a7d65", fontSize: 12, fontFamily: "sans-serif", cursor: "pointer" }}>Cancel</button>
              <button onClick={addCustomItem} style={{ flex: 1, padding: 9, background: "linear-gradient(135deg,#c19748,#a07830)", border: "none", borderRadius: 6, color: "#0f0f0f", fontSize: 12, fontWeight: 700, fontFamily: "sans-serif", cursor: "pointer" }}>Add Item</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: 10, marginBottom: 10, background: "#13110d", border: "1px dashed #3a2e1a", borderRadius: 8, color: "#8a7d65", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer" }}>+ Add Custom Item</button>
        )}

        <button onClick={exportList} style={{ width: "100%", padding: 12, background: "#1e1608", border: "1px solid #c19748", borderRadius: 8, color: "#c19748", fontSize: 13, fontWeight: 700, fontFamily: "sans-serif", cursor: "pointer" }}>
          ⬇ Export List
        </button>
      </div>
    </div>
  );
}

// ─── Customer Presentation Mode ───────────────────────────────────────────────
function CustomerPresentation({ settings, customerName, projectDesc, customerPrice, areas,
  jobNotes, trueCost, markupMode, markupPercent, estimateNumber, onClose }) {

  const c = settings.contractor || {};
  const fmt = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtD = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ratio = trueCost > 0 ? customerPrice / trueCost : 1;
  const mp = cost => fmtD(cost * ratio);
  const firstName = customerName ? customerName.split(" ")[0] : "";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const estNum = String(estimateNumber || 1).padStart(4, "0");

  const computed = areas.map(a => ({ input: a, ...computeAreaCost(a, settings) }));
  const totalSqft = areas.reduce((s, a) => s + nv(a.sqft), 0);
  const multiArea = computed.length > 1;
  const allServiceNames = computed.flatMap(c => c.enabledServices.map(sv => sv.name));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(160deg, #1a1608 0%, #0a0906 60%, #13100a 100%)",
      overflowY: "auto", WebkitOverflowScrolling: "touch",
      display: "flex", flexDirection: "column",
    }}>
      {/* Exit button */}
      <button onClick={onClose} style={{
        position: "fixed", top: 16, right: 16, zIndex: 10000,
        background: "rgba(15,13,10,0.85)", border: "1px solid #3a3020",
        borderRadius: 8, padding: "8px 14px", cursor: "pointer",
        color: "#5a4f38", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1,
      }}>✕ EXIT</button>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 28px 80px", width: "100%" }}>

        {/* Logo / Company Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {c.logo ? (
            <img src={c.logo} alt={c.companyName || "Company logo"} style={{
              maxHeight: 90, maxWidth: 280, objectFit: "contain", marginBottom: 16,
            }} />
          ) : (
            <img src="/icons/default-logo.png" alt="Precision Tile Co." style={{
              maxHeight: 90, maxWidth: 320, objectFit: "contain", marginBottom: 16, opacity: 0.85,
            }} />
          )}
          {c.companyName && c.logo && (
            <div style={{ fontSize: 14, color: "#8a7d65", fontFamily: "sans-serif", marginBottom: 4 }}>{c.companyName}</div>
          )}
          {c.companyName && !c.logo && (
            <div style={{ fontSize: 13, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 4 }}>{c.companyName}</div>
          )}
          {c.contactName && <div style={{ fontSize: 13, color: "#5a4f38", fontFamily: "sans-serif" }}>{c.contactName}</div>}
          {c.phone && <div style={{ fontSize: 13, color: "#5a4f38", fontFamily: "sans-serif" }}>{c.phone}</div>}
        </div>

        {/* Estimate label */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#c19748", letterSpacing: 6, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 8 }}>
            Estimate #{estNum}
          </div>
          <div style={{ fontSize: 13, color: "#5a4f38", fontFamily: "sans-serif" }}>{today}</div>
          {customerName && (
            <div style={{ fontSize: 18, color: "#d4c49a", fontFamily: "'Georgia','Times New Roman',serif", marginTop: 12 }}>
              Prepared for {customerName}
            </div>
          )}
          {projectDesc && (
            <div style={{ fontSize: 13, color: "#8a7d65", fontFamily: "sans-serif", marginTop: 4, fontStyle: "italic" }}>{projectDesc}</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #c19748, transparent)", marginBottom: 36 }} />

        {/* Project snapshot */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#c19748", letterSpacing: 4, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 16 }}>Project Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(193,151,72,0.06)", border: "1px solid #2e2518", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Area</div>
              <div style={{ fontSize: 20, color: "#e8c870", fontFamily: "'Georgia','Times New Roman',serif" }}>{totalSqft} sqft{multiArea ? ` · ${computed.length} areas` : ""}</div>
            </div>
            <div style={{ background: "rgba(193,151,72,0.06)", border: "1px solid #2e2518", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{multiArea ? "Areas" : "Tile"}</div>
              <div style={{ fontSize: multiArea ? 13 : 16, color: "#d4c49a", fontFamily: multiArea ? "sans-serif" : "'Georgia','Times New Roman',serif" }}>
                {multiArea ? computed.map(c => c.tile?.name || "—").join(", ") : (computed[0]?.tile?.name || "—")}
              </div>
            </div>
            {allServiceNames.length > 0 && (
              <div style={{ background: "rgba(193,151,72,0.06)", border: "1px solid #2e2518", borderRadius: 8, padding: "14px 16px", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Additional Services</div>
                <div style={{ fontSize: 13, color: "#d4c49a", fontFamily: "sans-serif" }}>{allServiceNames.join(", ")}</div>
              </div>
            )}
          </div>
          {jobNotes && jobNotes.trim() && (
            <div style={{ marginTop: 12, background: "rgba(193,151,72,0.04)", border: "1px solid #2e2518", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#8a7d65", fontFamily: "sans-serif", lineHeight: 1.6 }}>{jobNotes}</div>
            </div>
          )}
        </div>

        {/* Scope of Work — itemized per area */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#c19748", letterSpacing: 4, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 16 }}>
            {multiArea ? "Scope of Work" : "Price Breakdown"}
          </div>

          {computed.map((ca, idx) => {
            const { input, tile, tileWithWaste, tileCostPerSqFt, tileCost, laborCost, thinsetC, groutC,
              thinsetCost, groutCost, enabledServices, subtotal, area, linearFeet, wastePct } = ca;
            const tileSupplied = !tileCostPerSqFt || tileCostPerSqFt === 0;
            const svList = enabledServices;

            return (
              <div key={input.id} style={{ marginBottom: idx < computed.length - 1 ? 20 : 0, background: "rgba(193,151,72,0.04)", border: "1px solid #2e2518", borderRadius: 10, overflow: "hidden" }}>
                {multiArea && (
                  <div style={{ padding: "13px 20px", background: "rgba(193,151,72,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, color: "#e8c870", fontFamily: "'Georgia','Times New Roman',serif" }}>{areaLabel(input, tile, idx, settings.jobTypes)}</div>
                      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>{area} sqft</div>
                    </div>
                    <div style={{ fontSize: 15, color: "#c19748", fontWeight: 700, fontFamily: "sans-serif" }}>{mp(subtotal)}</div>
                  </div>
                )}

                {/* Tile material */}
                {tileSupplied ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #1a1710" }}>
                    <span style={{ fontSize: 14, color: "#5a4f38", fontFamily: "sans-serif", fontStyle: "italic" }}>Tile Material</span>
                    <span style={{ fontSize: 14, color: "#5a4f38", fontFamily: "sans-serif", fontStyle: "italic" }}>Customer supplied</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #1a1710" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>{tile?.name} — Tile Material</div>
                      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>{(tileWithWaste||0).toFixed(0)} sqft ordered (includes waste)</div>
                    </div>
                    <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", flexShrink: 0, marginLeft: 16 }}>{mp(tileCost)}</span>
                  </div>
                )}

                {/* Installation labor */}
                {tile && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #1a1710" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>{tile.name} — Installation</div>
                      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>{area} sqft</div>
                    </div>
                    <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", flexShrink: 0, marginLeft: 16 }}>{mp(laborCost)}</span>
                  </div>
                )}

                {/* Thinset */}
                {thinsetC && thinsetCost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #1a1710" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>{thinsetC.name}</div>
                      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>{(() => { const n = materialUnits(thinsetC, area, linearFeet, wastePct); return `${n} ${pluralUnit(unitLabelOf(thinsetC), n)}`; })()}</div>
                    </div>
                    <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", flexShrink: 0, marginLeft: 16 }}>{mp(thinsetCost)}</span>
                  </div>
                )}

                {/* Grout */}
                {groutC && groutCost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px", borderBottom: svList.length > 0 ? "1px solid #1a1710" : "none" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>{groutC.name}</div>
                      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>{(() => { const n = materialUnits(groutC, area, linearFeet, wastePct); return `${n} ${pluralUnit(unitLabelOf(groutC), n)}`; })()}</div>
                    </div>
                    <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", flexShrink: 0, marginLeft: 16 }}>{mp(groutCost)}</span>
                  </div>
                )}

                {/* Each service */}
                {svList.map((sv, svIdx) => {
                  const st = input.serviceState[sv.id] || {};
                  const svConsumables = (sv.consumableIds||[]).map(cId => settings.consumables.find(x => x.id === cId)).filter(Boolean);
                  const isLast = svIdx === svList.length - 1;
                  return (
                    <div key={sv.id} style={{ borderBottom: isLast ? "none" : "1px solid #1a1710" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 20px 6px", background: "rgba(193,151,72,0.04)" }}>
                        <span style={{ fontSize: 14, color: "#c19748", fontFamily: "sans-serif", fontWeight: 600 }}>{sv.name}</span>
                        <span style={{ fontSize: 14, color: "#c19748", fontFamily: "sans-serif", flexShrink: 0, marginLeft: 16 }}>{mp(ca.getServiceCost(sv))}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 20px 4px 32px" }}>
                        <span style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif" }}>Labor</span>
                        <span style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif" }}>{mp((area||0) * (parseFloat(st.overrides?.__labor__ ?? sv.laborPerSqFt)||0))}</span>
                      </div>
                      {svConsumables.map(c => {
                        const ovVal = st.overrides?.[c.id];
                        const effectiveC = ovVal !== undefined ? { ...c, bagPrice: ovVal, unitCost: ovVal } : c;
                        const qty = c.priceType === "flat" ? nv(st.overrides?.["qty__" + c.id], 1) : 1;
                        const lineCost = consumableCost(effectiveC, area, linearFeet, wastePct, qty);
                        return lineCost > 0 ? (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 20px 4px 32px" }}>
                            <span style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif" }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "#5a4f38", fontFamily: "sans-serif" }}>{mp(lineCost)}</span>
                          </div>
                        ) : null;
                      })}
                      <div style={{ height: 6 }} />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Misc supplies (applies to the whole job, shown once at the end) */}
          {(() => {
            const knownCost = computed.reduce((s, c) => s + c.subtotal, 0);
            const miscCost = trueCost - knownCost;
            return miscCost > 0.01 ? (
              <div style={{ marginTop: 12, background: "rgba(193,151,72,0.04)", border: "1px solid #2e2518", borderRadius: 10, display: "flex", justifyContent: "space-between", padding: "13px 20px" }}>
                <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>Supplies & Sundries</span>
                <span style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif" }}>{mp(miscCost)}</span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Total — hero number */}
        <div style={{ background: "linear-gradient(135deg, #1e1a10, #13110d)", border: "2px solid #c19748", borderRadius: 12, padding: "28px 24px", textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: "#c19748", letterSpacing: 6, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 12 }}>Total Investment</div>
          <div style={{ fontSize: 52, color: "#e8c870", fontFamily: "'Georgia','Times New Roman',serif", fontWeight: 400, letterSpacing: -1 }}>
            {fmt(customerPrice)}
          </div>
          <div style={{ fontSize: 14, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 8 }}>
            {fmtD(customerPrice / (totalSqft || 1))} per square foot
          </div>
        </div>

        {/* Terms */}
        {settings.defaultTerms && settings.defaultTerms.trim() && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: "#3a3020", letterSpacing: 4, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 10 }}>Terms</div>
            {settings.defaultTerms.trim().split("\n").map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: "#3a3020", fontFamily: "sans-serif", lineHeight: 1.8 }}>{t}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #2e2518, transparent)", marginBottom: 24 }} />
        <div style={{ textAlign: "center", color: "#3a3020", fontFamily: "sans-serif", fontSize: 12, lineHeight: 1.8 }}>
          {c.contactName && <div>{c.contactName}</div>}
          {c.companyName && <div>{c.companyName}</div>}
          {c.phone && <div>{c.phone}</div>}
          {c.email && <div>{c.email}</div>}
          {c.website && <div>{c.website}</div>}
        </div>
      </div>
    </div>
  );
}


// ─── Version Check Banner ─────────────────────────────────────────────────────
const APP_VERSION = "1.13.0";

function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Fetch version.json bypassing cache to check for updates
    fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.version && data.version !== APP_VERSION) {
          setUpdateAvailable(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!updateAvailable) return null;

  function handleRefresh() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        Promise.all(regs.map(r => r.unregister())).then(() => {
          caches.keys().then(keys => {
            Promise.all(keys.map(k => caches.delete(k))).then(() => {
              window.location.reload();
            });
          });
        });
      });
    } else {
      window.location.reload();
    }
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1208, #0f0d06)",
      borderBottom: "2px solid #c19748",
      padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "sans-serif",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>🆕</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#c19748", fontWeight: 700 }}>Update available</div>
        <div style={{ fontSize: 11, color: "#5a4f38", marginTop: 1 }}>A new version of Tile Job Estimator is ready.</div>
      </div>
      <button onClick={handleRefresh} style={{
        background: "linear-gradient(135deg, #c19748, #a07830)",
        border: "none", borderRadius: 6, padding: "8px 14px",
        cursor: "pointer", color: "#0f0f0f", fontSize: 12, fontWeight: 700,
        letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0,
      }}>Refresh</button>
    </div>
  );
}

function AreaCard({ index, input, computed, settings, expanded, onToggleExpand, onUpdate, onRemove, canRemove,
  onSelectTile, onSelectJobType, onToggleService, onSetOverride, getOverride }) {
  const { area, linearFeet, wastePct, tile, tileWithWaste, enabledServices, subtotal, getServiceCost } = computed;
  const thinsetOptions = settings.consumables.filter(c => c.role === "thinset");
  const groutOptions   = settings.consumables.filter(c => c.role === "grout");

  return (
    <div style={{ background: "#161208", border: "1px solid #2e2518", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
      <button onClick={onToggleExpand} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: "#f0ede6",
      }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "sans-serif" }}>
            {(tile || input.jobTypeId) ? `${index + 1}. ${areaLabel(input, tile, index, settings.jobTypes)}` : `Area ${index + 1}`}
          </div>
          <div style={{ fontSize: 11, color: "#8a7d65", fontFamily: "sans-serif", marginTop: 2 }}>
            {area > 0 ? `${area} sqft` : "No sqft yet"}{tile ? "" : " · No tile yet"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {area > 0 && tile && <span style={{ fontSize: 13, color: "#c19748", fontWeight: 700, fontFamily: "sans-serif" }}>{fmt(subtotal)}</span>}
          <span style={{ fontSize: 12, color: "#5a4f38" }}>{expanded ? "▾" : "▸"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 18px", borderTop: "1px solid #1a1710" }}>

          {/* Job Type */}
          <div style={{ marginTop: 16, marginBottom: 18 }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>Job Type (optional)</div>
            {(!settings.jobTypes || settings.jobTypes.length === 0) ? (
              <EmptyState msg="No job types yet — add some in ⚙ Settings → Job Types" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))", gap: 8 }}>
                {settings.jobTypes.map(jt => (
                  <button key={jt.id} onClick={() => onSelectJobType(jt)} style={{
                    background: input.jobTypeId === jt.id ? "#c19748" : "#1c1812",
                    border: `1px solid ${input.jobTypeId === jt.id ? "#c19748" : "#2e2518"}`,
                    borderRadius: 6, padding: "10px 6px", cursor: "pointer",
                    color: input.jobTypeId === jt.id ? "#0f0f0f" : "#c8b98a",
                    textAlign: "center", transition: "all 0.18s",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{jt.icon}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "sans-serif" }}>{jt.name || "Unnamed"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Square Footage */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 5 }}>Square Footage</div>
            <input type="number" placeholder="e.g. 200" value={input.sqft} onChange={e => onUpdate({ sqft: e.target.value })} style={inputStyle} />
            <div style={{ marginTop: 12 }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 5 }}>Linear Feet (optional)</div>
              <input type="number" placeholder="e.g. 60" value={input.linearFt} onChange={e => onUpdate({ linearFt: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {/* Tile Type */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>Tile Type</div>
            {settings.tiles.length === 0 ? <EmptyState msg="No tile types yet — add some in ⚙ Settings → Tile Types" /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 8 }}>
                {settings.tiles.map(t => (
                  <button key={t.id} onClick={() => onSelectTile(t)} style={{
                    background: input.tileId === t.id ? "#c19748" : "#1c1812",
                    border: `1px solid ${input.tileId === t.id ? "#c19748" : "#2e2518"}`,
                    borderRadius: 6, padding: "12px 8px", cursor: "pointer",
                    color: input.tileId === t.id ? "#0f0f0f" : "#c8b98a",
                    textAlign: "center", transition: "all 0.18s",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 5 }}>{t.icon}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "sans-serif" }}>{t.name || "Unnamed"}</div>
                    <div style={{ fontSize: 10.5, marginTop: 3, opacity: 0.75, fontFamily: "sans-serif" }}>${nv(t.labor)}/sqft</div>
                  </button>
                ))}
              </div>
            )}
            {tile && (
              <>
                <div style={{ marginTop: 10, background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 14px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                  <InfoPill label="Labor Rate"    value={`$${nv(tile.labor)}/sqft`} />
                  <InfoPill label="Sqft to Order" value={area > 0 ? `${tileWithWaste.toFixed(0)} sqft` : "—"} gold />
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10.5, color: "#c19748", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Tile Cost $/sqft</div>
                    <input type="number" placeholder="0.00" value={input.tilePriceSqFt} onChange={e => onUpdate({ tilePriceSqFt: e.target.value })} style={iStyle} min="0" />
                  </div>
                  <div style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10.5, color: "#8a7d65", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Waste %</div>
                    <input type="number" placeholder="10" value={input.wastePercent} onChange={e => onUpdate({ wastePercent: e.target.value })} style={iStyle} min="0" />
                  </div>
                </div>
              </>
            )}
            {(thinsetOptions.length > 0 || groutOptions.length > 0) && (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {thinsetOptions.length > 0 && (
                  <div style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10.5, color: "#8a7d65", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Thinset</div>
                    <select value={input.thinsetId || thinsetOptions[0].id} onChange={e => onUpdate({ thinsetId: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                      {thinsetOptions.map(c => <option key={c.id} value={c.id}>{c.name || "Unnamed"} — {materialPriceLine(c)}</option>)}
                    </select>
                  </div>
                )}
                {groutOptions.length > 0 && (
                  <div style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10.5, color: "#8a7d65", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Grout</div>
                    <select value={input.groutId || groutOptions[0].id} onChange={e => onUpdate({ groutId: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                      {groutOptions.map(c => <option key={c.id} value={c.id}>{c.name || "Unnamed"} — {materialPriceLine(c)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Services */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>Additional Services</div>
            {settings.services.length === 0 ? <EmptyState msg="No services yet — add some in ⚙ Settings → Services" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {settings.services.map(sv => {
                  const isOn   = !!input.serviceState[sv.id]?.enabled;
                  const svCost = getServiceCost(sv);
                  const assignedConsumables = sv.consumableIds.map(cId => settings.consumables.find(c => c.id === cId)).filter(Boolean);
                  return (
                    <div key={sv.id} style={{ background: isOn ? "#1a1710" : "#0f0d0a", border: `1px solid ${isOn ? "#c19748" : "#2a2218"}`, borderRadius: 8, overflow: "hidden", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer" }} onClick={() => onToggleService(sv.id)}>
                        <Checkbox checked={isOn} onChange={() => onToggleService(sv.id)} onClick={e => e.stopPropagation()} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{sv.name || "Unnamed"}</div>
                          <div style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif", marginTop: 2 }}>
                            Labor ${nv(sv.laborPerSqFt)}/sqft · {assignedConsumables.length} material{assignedConsumables.length !== 1 ? "s" : ""}
                            {isOn && area > 0 && <span style={{ color: "#c19748", marginLeft: 10 }}>{fmt(svCost)} total</span>}
                          </div>
                        </div>
                      </div>

                      {isOn && (
                        <div style={{ borderTop: "1px solid #2a2518", padding: "10px 13px 12px" }}>
                          <div style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 8, fontStyle: "italic" }}>
                            Override any cost for this area — leave as-is to use your defaults
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                            <div style={{ fontSize: 12.5, color: "#c8b98a", fontFamily: "sans-serif" }}>Labor</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "#5a4f38", fontSize: 11 }}>$</span>
                              <input type="number" value={getOverride(sv.id, "__labor__", sv.laborPerSqFt)}
                                onChange={e => onSetOverride(sv.id, "__labor__", e.target.value)}
                                style={{ ...iStyle, flex: 1, fontSize: 12.5 }} />
                            </div>
                            <div style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif", background: "#0f0d0a", border: "1px solid #2a2010", borderRadius: 4, padding: "5px 6px", textAlign: "center" }}>/sqft</div>
                          </div>

                          {assignedConsumables.map(c => {
                            const defaultCost = c.priceType === "bag" ? c.bagPrice : c.unitCost;
                            const ovVal = getOverride(sv.id, c.id, defaultCost);
                            const effectiveC = { ...c, bagPrice: ovVal, unitCost: ovVal };
                            const qty = c.priceType === "flat" ? nv(getOverride(sv.id, "qty__" + c.id, 1), 1) : 1;
                            const lineTotal = consumableCost(effectiveC, area, linearFeet, wastePct, qty);
                            const basisNote = c.priceType === "bag" && c.coverageBasis === "linear"
                              ? `${materialUnits(effectiveC, area, linearFeet, wastePct)} ${pluralUnit(unitLabelOf(c), materialUnits(effectiveC, area, linearFeet, wastePct))} · ${linearFeet} ln ft`
                              : null;
                            return (
                              <div key={c.id} style={{ marginBottom: 8 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px", gap: 8, alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: 12.5, color: "#c8b98a", fontFamily: "sans-serif" }}>{c.name}</div>
                                    {area > 0 && <div style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif" }}>{fmt(lineTotal)} total{basisNote ? ` · ${basisNote}` : ""}</div>}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ color: "#5a4f38", fontSize: 11 }}>$</span>
                                    <input type="number" value={ovVal} onChange={e => onSetOverride(sv.id, c.id, e.target.value)}
                                      style={{ ...iStyle, flex: 1, fontSize: 12.5 }} />
                                  </div>
                                  <div style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif", background: "#0f0d0a", border: "1px solid #2a2010", borderRadius: 4, padding: "5px 6px", textAlign: "center" }}>
                                    {c.priceType === "bag" ? `$/${unitLabelOf(c)}` : c.priceType === "sqft" ? "/sqft" : "flat"}
                                  </div>
                                </div>
                                {c.priceType === "flat" && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: 10.5, color: "#5a4f38", fontFamily: "sans-serif" }}>Quantity</span>
                                    <input type="number" min="0" value={qty}
                                      onChange={e => onSetOverride(sv.id, "qty__" + c.id, e.target.value)}
                                      style={{ ...iStyle, width: 56, fontSize: 11.5, padding: "4px 8px" }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {area > 0 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2a2010", display: "flex", justifyContent: "space-between", fontFamily: "sans-serif" }}>
                              <span style={{ fontSize: 11.5, color: "#5a4f38" }}>Service total</span>
                              <span style={{ fontSize: 13, color: "#e8c870" }}>{fmt(svCost)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canRemove && (
            <button onClick={onRemove} style={{
              marginTop: 12, fontSize: 11.5, color: "#b05050", background: "none",
              border: "1px solid #3a2020", borderRadius: 5, padding: "6px 12px", cursor: "pointer", fontFamily: "sans-serif",
            }}>Remove This Area</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TileEstimator() {
  const [page, setPage] = useState("estimate");
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("tje_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults so new fields added in updates always exist
        const merged = {
          miscPercent: 3, defaultMarkup: 40,
          consumables: SEED_CONSUMABLES,
          tiles: SEED_TILES,
          services: SEED_SERVICES,
          jobTypes: SEED_JOB_TYPES,
          contractor: { companyName: "", contactName: "", phone: "", email: "", website: "" },
          estimateNumber: 1,
          defaultTerms: "50% deposit required to schedule.\nRemaining balance due upon completion.\nThis estimate is valid for 30 days.\nAny additional work outside this scope will be quoted separately.",
          ...parsed,
        };
        merged.consumables = migrateConsumableRoles(merged.consumables);
        return merged;
      }
    } catch (e) {}
    return {
      miscPercent: 3, defaultMarkup: 40,
      consumables: SEED_CONSUMABLES,
      tiles: SEED_TILES,
      services: SEED_SERVICES,
      jobTypes: SEED_JOB_TYPES,
      contractor: { companyName: "", contactName: "", phone: "", email: "", website: "" },
      estimateNumber: 1,
      defaultTerms: "50% deposit required to schedule.\nRemaining balance due upon completion.\nThis estimate is valid for 30 days.\nAny additional work outside this scope will be quoted separately.",
    };
  });
  const [savedMsg, setSavedMsg] = useState(false);
  const [unsavedWarning, setUnsavedWarning] = useState(false);

  const [areas, setAreas] = useState(() => [newAreaInput()]);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  // When an existing sent estimate or draft is loaded via "Load into Estimator" / "Load & Edit",
  // this tracks its id + type so re-sending/re-saving updates that record instead of creating a duplicate.
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingRecordType, setEditingRecordType] = useState(null); // "estimate" | "draft" | null
  const [jobNotes, setJobNotes]             = useState("");
  const [customerName, setCustomerName]     = useState("");
  const [customerEmail, setCustomerEmail]   = useState("");
  const [customerPhone, setCustomerPhone]   = useState("");
  const [projectDesc, setProjectDesc]       = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustForm, setNewCustForm]       = useState({ name: "", email: "", phone: "" });
  const [markupMode, setMarkupMode]         = useState("percent");
  const [markupPercent, setMarkupPercent]   = useState(40);
  const [manualPrice, setManualPrice]       = useState("");
  const [showBreakdown, setShowBreakdown]   = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(() => {
    try {
      const last = localStorage.getItem("tje_last_backup_reminder");
      if (!last) return true;
      const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
      return daysSince > 14;
    } catch (e) { return false; }
  });
  const [estimateHistory, setEstimateHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const resultRef = useRef(null);

  // Shopping-list tracking — lifted here (rather than duplicated per-page) so History,
  // Accounting, and the Customer tab all see the same Materials Status and open the same modal.
  const [shoppingListFor, setShoppingListFor] = useState(null);
  const [shoppingListsById, setShoppingListsById] = useState({});
  function refreshShoppingLists() {
    dbGetAll("shoppingLists").then(all => {
      const byId = {};
      (all || []).forEach(rec => { byId[rec.estimateId] = rec; });
      setShoppingListsById(byId);
    }).catch(() => {});
  }
  useEffect(() => { refreshShoppingLists(); }, []);


  // Auto-save customer: tracks the live customer list for the debounced save effect below,
  // and whether the project description has been hand-edited (so job-type auto-fill backs off).
  const customersRef = useRef(customers);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  const customerSaveTimerRef = useRef(null);
  const projectDescManualRef = useRef(false);
  // Duplicate-customer detection: when phone/email matches someone with a different name,
  // we hold off auto-saving and surface a Merge / Save as new prompt instead.
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);
  const duplicateIgnoreKeyRef = useRef("");
  // Tracks the id of a customer record auto-created for the *current* form session (name typed
  // before phone/email caught up), so a later phone/email match still checks against everyone
  // else instead of just comparing the stray record to itself.
  const autoCreatedIdRef = useRef(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    Promise.all([dbGetAll("estimates"), dbGetAll("customers"), dbGetAll("drafts")]).then(([ests, custs, drs]) => {
      setEstimateHistory(ests.sort((a, b) => new Date(b.dateISO||b.date) - new Date(a.dateISO||a.date)));
      setCustomers(custs.sort((a, b) => (a.name||"").localeCompare(b.name||"")));
      setDrafts(drs.sort((a, b) => new Date(b.dateISO||b.date) - new Date(a.dateISO||a.date)));
      setDbReady(true);
    }).catch(() => setDbReady(true));
  }, []);

  // Auto-save customer: once a name is entered, debounce a save of name/email/phone.
  // A phone or email that matches a *different* customer always surfaces the Merge / Save-as-new
  // prompt — even if the name currently matches a record we ourselves just auto-created a moment
  // earlier (name typed before phone caught up), so a same-name self-match never short-circuits
  // the duplicate check.
  useEffect(() => {
    if (customerSaveTimerRef.current) clearTimeout(customerSaveTimerRef.current);
    const name = customerName.trim();
    if (!name) { setDuplicateCandidate(null); return; }
    customerSaveTimerRef.current = setTimeout(() => {
      const email = customerEmail.trim();
      const phone = customerPhone.trim();
      const normPhone = phone.replace(/\D/g, "");
      const normEmail = email.toLowerCase();
      const key = name + "|" + email + "|" + phone;

      const nameMatch = customersRef.current.find(c => (c.name || "").trim().toLowerCase() === name.toLowerCase());
      const excludeId = nameMatch ? nameMatch.id : null;

      let candidate = null, matchField = null;
      if (normPhone) {
        candidate = customersRef.current.find(c => c.id !== excludeId && c.phone && c.phone.replace(/\D/g, "") === normPhone);
        if (candidate) matchField = "phone";
      }
      if (!candidate && normEmail) {
        candidate = customersRef.current.find(c => c.id !== excludeId && (c.email || "").trim().toLowerCase() === normEmail);
        if (candidate) matchField = "email";
      }

      if (candidate) {
        if (duplicateIgnoreKeyRef.current !== key) {
          setDuplicateCandidate({ id: candidate.id, name: candidate.name, email: candidate.email || "", phone: candidate.phone || "", matchField });
        }
        return;
      }
      setDuplicateCandidate(null);

      if (nameMatch) {
        // If an earlier (now-superseded) name produced its own stray record this session, clean it up.
        if (autoCreatedIdRef.current && autoCreatedIdRef.current !== nameMatch.id) {
          deleteCustomer(autoCreatedIdRef.current);
        }
        autoCreatedIdRef.current = nameMatch.id;
        if (!(nameMatch.name === name && (nameMatch.email || "") === email && (nameMatch.phone || "") === phone)) {
          saveCustomer({ id: nameMatch.id, name, email, phone });
        }
        return;
      }

      // Genuinely new — but if this session already created a stray record, update it in place
      // instead of creating a second one.
      if (autoCreatedIdRef.current) {
        saveCustomer({ id: autoCreatedIdRef.current, name, email, phone });
      } else {
        saveCustomer({ name, email, phone }).then(rec => { autoCreatedIdRef.current = rec.id; });
      }
    }, 700);
    return () => clearTimeout(customerSaveTimerRef.current);
  }, [customerName, customerEmail, customerPhone]);

  function resolveDuplicateMerge() {
    if (!duplicateCandidate) return;
    // Keep the established customer's name rather than overwriting it with whatever was typed
    // this time (e.g. a shortened "chris" shouldn't clobber the on-file "Chris Burgess"); fill
    // in email/phone from what's typed, falling back to what's already on file.
    const mergedName = duplicateCandidate.name;
    const mergedEmail = customerEmail.trim() || duplicateCandidate.email || "";
    const mergedPhone = customerPhone.trim() || duplicateCandidate.phone || "";
    if (autoCreatedIdRef.current && autoCreatedIdRef.current !== duplicateCandidate.id) {
      deleteCustomer(autoCreatedIdRef.current); // remove the stray record created before the match was found
    }
    saveCustomer({ id: duplicateCandidate.id, name: mergedName, email: mergedEmail, phone: mergedPhone });
    autoCreatedIdRef.current = duplicateCandidate.id;
    setCustomerName(mergedName);
    setCustomerEmail(mergedEmail);
    setCustomerPhone(mergedPhone);
    setDuplicateCandidate(null);
  }
  function resolveDuplicateAsNew() {
    const name = customerName.trim(), email = customerEmail.trim(), phone = customerPhone.trim();
    duplicateIgnoreKeyRef.current = name + "|" + email + "|" + phone;
    if (autoCreatedIdRef.current) {
      saveCustomer({ id: autoCreatedIdRef.current, name, email, phone });
    } else {
      saveCustomer({ name, email, phone }).then(rec => { autoCreatedIdRef.current = rec.id; });
    }
    setDuplicateCandidate(null);
  }

  // Project description auto-fill: mirrors the selected job type(s) across areas
  // ("Kitchen Floor & Shower") until the user types their own description.
  useEffect(() => {
    if (projectDescManualRef.current) return;
    const names = [];
    areas.forEach(a => {
      if (!a.jobTypeId) return;
      const jt = (settings.jobTypes || []).find(j => j.id === a.jobTypeId);
      if (jt?.name && !names.includes(jt.name)) names.push(jt.name);
    });
    const auto = names.join(" & ");
    setProjectDesc(prev => (prev === auto ? prev : auto));
  }, [areas, settings.jobTypes]);

  function handleSaveSettings(s) {
    try { localStorage.setItem("tje_settings", JSON.stringify(s)); } catch (e) {}
    setSettings(s);
    setMarkupPercent(nv(s.defaultMarkup, 40));
    setAreas(prev => prev.map(a => ({
      ...a,
      tileId: (a.tileId && !s.tiles.find(t => t.id === a.tileId)) ? null : a.tileId,
      thinsetId: (a.thinsetId && !s.consumables.find(c => c.id === a.thinsetId)) ? null : a.thinsetId,
      groutId: (a.groutId && !s.consumables.find(c => c.id === a.groutId)) ? null : a.groutId,
    })));
    setSavedMsg(true);
    setUnsavedWarning(false);
    setTimeout(() => { setSavedMsg(false); setPage("estimate"); }, 1200);
  }

  function saveEstimateToHistory(estNum, customerName, customerEmail, customerPhone, projectDesc, totalPrice, emailText, smsText, existingId) {
    const record = {
      id: existingId || uid(),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      dateISO: new Date().toISOString(),
      estNum,
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      projectDesc: projectDesc || "",
      totalPrice,
      trueCost,
      profit,
      margin,
      // Full input snapshot — one entry per area
      areas: JSON.parse(JSON.stringify(areas)),
      // Summary fields kept for list-view display and back-compat with older UI bits
      sqft: totalSqft,
      linearFt: areas.reduce((s, a) => s + nv(a.linearFt), 0),
      tileName: computedAreas.length === 1 ? (computedAreas[0].tile?.name || "") : `${computedAreas.length} areas`,
      markupMode,
      markupPercent,
      jobNotes: jobNotes || "",
      // Estimate text
      emailText: emailText || "",
      smsText: smsText || "",
    };
    dbPut("estimates", record).then(() => {
      setEstimateHistory(prev => {
        const exists = prev.some(r => r.id === record.id);
        const next = exists
          ? prev.map(r => r.id === record.id ? record : r)
          : [record, ...prev].slice(0, 500);
        // Also trim IndexedDB itself so it doesn't grow unbounded past the cap
        if (!exists && prev.length + 1 > 500) {
          dbGetAll("estimates").then(all => {
            const sorted = all.sort((a, b) => new Date(b.dateISO||b.date) - new Date(a.dateISO||a.date));
            const excess = sorted.slice(500);
            excess.forEach(rec => dbDelete("estimates", rec.id));
          }).catch(() => {});
        }
        return next;
      });
    }).catch(() => {
      setEstimateHistory(prev => {
        const exists = prev.some(r => r.id === record.id);
        return exists ? prev.map(r => r.id === record.id ? record : r) : [record, ...prev].slice(0, 500);
      });
    });
  }

  // Customer CRUD
  function saveCustomer(customer) {
    const record = { ...customer, id: customer.id || uid() };
    return dbPut("customers", record).then(() => {
      setCustomers(prev => {
        const filtered = prev.filter(c => c.id !== record.id);
        return [...filtered, record].sort((a, b) => (a.name||"").localeCompare(b.name||""));
      });
      return record;
    });
  }

  function deleteCustomer(id) {
    dbDelete("customers", id).then(() => {
      setCustomers(prev => prev.filter(c => c.id !== id));
    });
  }

  // Merges one customer into another: keeps the target's name, fills in any blank email/phone
  // from the source, reassigns every estimate and draft that references the source customer's
  // name so they show up under the merged record, then removes the source customer.
  function mergeCustomers(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = customers.find(c => c.id === sourceId);
    const target = customers.find(c => c.id === targetId);
    if (!source || !target) return;

    const mergedName = target.name;
    const mergedEmail = target.email || source.email || "";
    const mergedPhone = target.phone || source.phone || "";
    const srcNameLower = (source.name || "").trim().toLowerCase();

    setEstimateHistory(prev => prev.map(e => {
      if ((e.customerName || "").trim().toLowerCase() !== srcNameLower) return e;
      const updated = { ...e, customerName: mergedName };
      dbPut("estimates", updated);
      return updated;
    }));
    setDrafts(prev => prev.map(d => {
      if ((d.customerName || "").trim().toLowerCase() !== srcNameLower) return d;
      const updated = { ...d, customerName: mergedName };
      dbPut("drafts", updated);
      return updated;
    }));

    // Keep the in-progress estimate form in sync if it currently points at the customer being merged away.
    if ((customerName || "").trim().toLowerCase() === srcNameLower) {
      setCustomerName(mergedName);
      setCustomerEmail(mergedEmail);
      setCustomerPhone(mergedPhone);
    }
    if (autoCreatedIdRef.current === sourceId) autoCreatedIdRef.current = targetId;

    saveCustomer({ id: target.id, name: mergedName, email: mergedEmail, phone: mergedPhone });
    deleteCustomer(source.id);
  }

  function updateEstimateRecord(id, updates) {
    setEstimateHistory(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const record = updated.find(e => e.id === id);
      if (record) dbPut("estimates", record);
      return updated;
    });
  }

  function deleteEstimateRecord(id) {
    dbDelete("estimates", id).then(() => {
      setEstimateHistory(prev => prev.filter(e => e.id !== id));
    });
  }

  function saveDraft() {
    const isUpdatingExisting = editingRecordType === "draft" && editingRecordId;
    let draftNum;
    if (isUpdatingExisting) {
      draftNum = drafts.find(d => d.id === editingRecordId)?.draftNum || "D-0000";
    } else {
      const draftCounter = parseInt(localStorage.getItem("tje_draft_number") || "0") + 1;
      localStorage.setItem("tje_draft_number", String(draftCounter));
      draftNum = "D-" + String(draftCounter).padStart(4, "0");
    }
    const record = {
      id: isUpdatingExisting ? editingRecordId : uid(),
      draftNum,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      dateISO: new Date().toISOString(),
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      projectDesc: projectDesc || "",
      totalPrice: customerPrice,
      areas: JSON.parse(JSON.stringify(areas)),
      sqft: totalSqft,
      linearFt: areas.reduce((s, a) => s + nv(a.linearFt), 0),
      tileName: computedAreas.length === 1 ? (computedAreas[0].tile?.name || "") : `${computedAreas.length} areas`,
      markupMode,
      markupPercent,
      jobNotes: jobNotes || "",
      emailText: "",
      smsText: "",
      status: "draft",
    };
    dbPut("drafts", record).then(() => {
      setDrafts(prev => isUpdatingExisting ? prev.map(d => d.id === record.id ? record : d) : [record, ...prev]);
    });
    setEditingRecordId(record.id); setEditingRecordType("draft");
    return draftNum;
  }

  function deleteDraft(id) {
    dbDelete("drafts", id).then(() => {
      setDrafts(prev => prev.filter(d => d.id !== id));
    });
  }

  function sendDraft(draft, emailText, smsText) {
    // Assign real estimate number
    const estNum = String(settings.estimateNumber || 1).padStart(4, "0");
    setSettings(p => {
      const next = { ...p, estimateNumber: (p.estimateNumber || 1) + 1 };
      try { localStorage.setItem("tje_settings", JSON.stringify(next)); } catch (e) {}
      return next;
    });
    // Save to estimates
    const record = { ...draft, estNum, draftNum: draft.draftNum, emailText, smsText, status: "sent", sentDate: new Date().toISOString() };
    dbPut("estimates", record).then(() => {
      setEstimateHistory(prev => [record, ...prev]);
    });
    // Remove from drafts
    deleteDraft(draft.id);
  }

  function handleExport(s) {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    const filename = `tje-backup-${stamp}.json`;
    Promise.all([dbGetAll("estimates"), dbGetAll("customers"), dbGetAll("drafts")]).then(([ests, custs, drs]) => {
      const draftCounter = parseInt(localStorage.getItem("tje_draft_number") || "0");
      const backup = { settings: s, estimates: ests, customers: custs, drafts: drs, draftCounter, version: APP_VERSION, exportDate: now.toISOString() };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleImport(jsonText, onLoaded) {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") {
        alert("This doesn't look like a valid Tile Job Estimator backup file.");
        return;
      }
      // Support both old format (settings only) and new format (settings + estimates + customers)
      const rawSettings = parsed.settings || parsed;
      if (!rawSettings.tiles && !rawSettings.consumables && !rawSettings.contractor) {
        alert("This doesn't look like a valid Tile Job Estimator backup file.");
        return;
      }
      const merged = {
        miscPercent: 3, defaultMarkup: 40,
        consumables: SEED_CONSUMABLES, tiles: SEED_TILES, services: SEED_SERVICES, jobTypes: SEED_JOB_TYPES,
        contractor: { companyName: "", contactName: "", phone: "", email: "", website: "" },
        estimateNumber: 1,
        defaultTerms: "50% deposit required to schedule.\nRemaining balance due upon completion.\nThis estimate is valid for 30 days.\nAny additional work outside this scope will be quoted separately.",
        ...rawSettings,
      };
      merged.consumables = migrateConsumableRoles(merged.consumables);
      try { localStorage.setItem("tje_settings", JSON.stringify(merged)); } catch (e) {}
      setSettings(merged);
      setMarkupPercent(nv(merged.defaultMarkup, 40));
      onLoaded(merged);

      // Restore draft counter (kept in localStorage, not IndexedDB)
      if (typeof parsed.draftCounter === "number") {
        try { localStorage.setItem("tje_draft_number", String(parsed.draftCounter)); } catch (e) {}
      }

      // Restore estimates
      if (parsed.estimates && Array.isArray(parsed.estimates)) {
        dbClear("estimates").then(() => {
          Promise.all(parsed.estimates.map(e => dbPut("estimates", e))).then(() => {
            setEstimateHistory(parsed.estimates.sort((a, b) => new Date(b.dateISO||b.date) - new Date(a.dateISO||a.date)));
          });
        });
      }
      // Restore customers
      if (parsed.customers && Array.isArray(parsed.customers)) {
        dbClear("customers").then(() => {
          Promise.all(parsed.customers.map(c => dbPut("customers", c))).then(() => {
            setCustomers(parsed.customers.sort((a, b) => (a.name||"").localeCompare(b.name||"")));
          });
        });
      }
      // Restore drafts
      if (parsed.drafts && Array.isArray(parsed.drafts)) {
        dbClear("drafts").then(() => {
          Promise.all(parsed.drafts.map(d => dbPut("drafts", d))).then(() => {
            setDrafts(parsed.drafts.sort((a, b) => new Date(b.dateISO||b.date) - new Date(a.dateISO||a.date)));
          });
        });
      }

      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (e) {
      alert("Failed to read backup file. Make sure it's a valid JSON export from this app.");
    }
  }

  // Per-area cost computation, then combined totals across every area in the job
  const computedAreas = areas.map(a => ({ input: a, ...computeAreaCost(a, settings) }));
  const totalSqft     = areas.reduce((sum, a) => sum + nv(a.sqft), 0);
  const totalLaborCost = computedAreas.reduce((sum, c) => sum + c.laborCost, 0);
  const areasSubtotal  = computedAreas.reduce((sum, c) => sum + c.subtotal, 0);
  const miscSupplies   = totalLaborCost * (nv(settings.miscPercent) / 100);
  const trueCost       = areasSubtotal + miscSupplies;

  const customerPrice = markupMode === "percent"
    ? trueCost * (1 + nv(markupPercent) / 100)
    : nv(manualPrice);
  const profit = customerPrice - trueCost;
  const margin = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;
  const canCalculate = areas.length > 0 && areas.every(a => nv(a.sqft) > 0 && a.tileId);

  // Generic per-area field updater
  function updateArea(areaId, patch) {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, ...patch } : a));
  }
  function addArea() {
    const na = newAreaInput();
    setAreas(prev => [...prev, na]);
    setExpandedAreaId(na.id);
  }
  function removeArea(areaId) {
    setAreas(prev => {
      const next = prev.filter(a => a.id !== areaId);
      return next.length > 0 ? next : [newAreaInput()];
    });
  }
  function toggleService(areaId, svId) {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const p = a.serviceState;
      return { ...a, serviceState: { ...p, [svId]: { ...p[svId], enabled: !p[svId]?.enabled } } };
    }));
  }
  // Selecting a tile type auto-enables its required services (does not disable anything already on)
  function selectTile(areaId, t) {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const required = t.serviceIds || [];
      let serviceState = a.serviceState;
      if (required.length > 0) {
        serviceState = { ...serviceState };
        required.forEach(svId => { serviceState[svId] = { ...serviceState[svId], enabled: true }; });
      }
      return { ...a, tileId: t.id, serviceState };
    }));
  }
  // Selecting a job type auto-enables its bundled services (does not disable anything already on)
  function selectJobType(areaId, jt) {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const required = jt.serviceIds || [];
      let serviceState = a.serviceState;
      if (required.length > 0) {
        serviceState = { ...serviceState };
        required.forEach(svId => { serviceState[svId] = { ...serviceState[svId], enabled: true }; });
      }
      return { ...a, jobTypeId: jt.id, serviceState };
    }));
  }
  function setOverride(areaId, svId, cId, val) {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const p = a.serviceState;
      return { ...a, serviceState: { ...p, [svId]: { ...p[svId], overrides: { ...(p[svId]?.overrides || {}), [cId]: val } } } };
    }));
  }
  function getOverride(areaInput, svId, cId, defaultVal) {
    const ov = areaInput.serviceState?.[svId]?.overrides?.[cId];
    return ov !== undefined ? ov : String(defaultVal);
  }

  const [calcNudge, setCalcNudge] = useState(false);

  function handleCalculate() {
    if (!canCalculate) {
      setCalcNudge(true);
      setTimeout(() => setCalcNudge(false), 3000);
      return;
    }
    // Haptic feedback on iOS
    if (navigator.vibrate) navigator.vibrate(10);
    setShowBreakdown(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  function resetEstimate() {
    setAreas([newAreaInput()]); setExpandedAreaId(null);
    setJobNotes(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setProjectDesc("");
    projectDescManualRef.current = false;
    setDuplicateCandidate(null); duplicateIgnoreKeyRef.current = ""; autoCreatedIdRef.current = null;
    setMarkupPercent(nv(settings.defaultMarkup, 40));
    setManualPrice(""); setShowBreakdown(false);
    setEditingRecordId(null); setEditingRecordType(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadEstimate(record) {
    const loaded = areasOf(record).map(a => ({
      id: a.id || uid(), jobTypeId: a.jobTypeId || null, name: a.name || "",
      sqft: String(a.sqft || ""), linearFt: String(a.linearFt || ""),
      tileId: a.tileId || null, thinsetId: a.thinsetId || null, groutId: a.groutId || null,
      tilePriceSqFt: String(a.tilePriceSqFt || ""), wastePercent: String(a.wastePercent || "10"),
      serviceState: a.serviceState || {},
    }));
    setAreas(loaded.length > 0 ? loaded : [newAreaInput()]);
    setExpandedAreaId(loaded[0]?.id || null);
    setJobNotes(record.jobNotes || "");
    setCustomerName(record.customerName || "");
    setCustomerEmail(record.customerEmail || "");
    setCustomerPhone(record.customerPhone || "");
    setProjectDesc(record.projectDesc || "");
    projectDescManualRef.current = true; // respect the saved description; don't overwrite from job type
    setDuplicateCandidate(null); duplicateIgnoreKeyRef.current = ""; autoCreatedIdRef.current = null;
    setMarkupMode(record.markupMode || "percent");
    setMarkupPercent(record.markupPercent || nv(settings.defaultMarkup, 40));
    setManualPrice("");
    setShowBreakdown(false);
    setEditingRecordId(record.id || null);
    setEditingRecordType(record.estNum ? "estimate" : (record.draftNum ? "draft" : null));
    setPage("estimate");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#f0ede6", fontFamily: "'Georgia','Times New Roman',serif", paddingBottom: 74 }}>
      <UpdateBanner />

      {/* Customer Presentation Overlay */}
      {showPresentation && (
        <CustomerPresentation
          settings={settings}
          customerName=""
          projectDesc={jobNotes}
          customerPrice={customerPrice}
          areas={areas}
          jobNotes={jobNotes}
          trueCost={trueCost}
          markupMode={markupMode}
          markupPercent={markupPercent}
          estimateNumber={settings.estimateNumber}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Shopping List Modal — available from any page (History, Accounting, Customers) */}
      {shoppingListFor && (
        <ShoppingListModal estimate={shoppingListFor} settings={settings} onClose={() => { setShoppingListFor(null); refreshShoppingLists(); }} />
      )}

      {/* Backup Reminder Banner */}
      {showBackupReminder && page === "estimate" && (
        <div style={{ background: "#0f0c06", borderBottom: "1px solid #3a2e1a", padding: "10px 16px", display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "sans-serif" }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💾</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#c19748", fontWeight: 700, marginBottom: 2 }}>Back up your settings</div>
            <div style={{ fontSize: 11, color: "#5a4f38", lineHeight: 1.5 }}>
              Your settings and estimate history are stored on this device only. If you clear the app, switch phones, or reinstall, everything will be lost. Export a backup regularly to keep your data safe.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setPage("settings"); setShowBackupReminder(false); try { localStorage.setItem("tje_last_backup_reminder", Date.now()); } catch(e){} }} style={{
              background: "linear-gradient(135deg,#c19748,#a07830)", border: "none", borderRadius: 6,
              padding: "6px 12px", cursor: "pointer", color: "#0f0f0f", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
            }}>Back Up Now</button>
            <button onClick={() => { setShowBackupReminder(false); try { localStorage.setItem("tje_last_backup_reminder", Date.now()); } catch(e){} }} style={{
              background: "none", border: "none", color: "#3a3020", fontSize: 11, cursor: "pointer", padding: "2px 0",
            }}>Remind me later</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1208,#0f0f0f)", borderBottom: "1px solid #3a2e1a", padding: "28px 32px 22px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(193,151,72,0.03) 20px,rgba(193,151,72,0.03) 21px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 6, color: "#c19748", textTransform: "uppercase" }}>Professional Estimating Tool</div>
              <h1 style={{ margin: "4px 0 0", fontSize: "clamp(22px,4vw,36px)", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.1 }}>
                Tile Job <span style={{ color: "#c19748", fontStyle: "italic" }}>Cost Estimator</span>
              </h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0, paddingTop: 2 }}>
              <div style={{ fontSize: 10, color: "#3a3020", fontFamily: "sans-serif", letterSpacing: 1 }}>v{APP_VERSION}</div>
              <button onClick={() => {
                if (page === "settings") setUnsavedWarning(true);
                setPage("help");
              }} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid #3a2e1a",
                background: "rgba(193,151,72,0.08)", color: "#c19748", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "sans-serif", flexShrink: 0,
              }}>?</button>
            </div>
          </div>
          {savedMsg && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#6dc47a", fontFamily: "sans-serif" }}>✓ Settings saved</div>
          )}
          {unsavedWarning && page !== "settings" && (
            <div style={{ background: "#1e1408", border: "1px solid #c19748", borderRadius: 6, padding: "8px 14px", marginTop: 8, marginBottom: 4, display: "flex", alignItems: "center", gap: 10, fontFamily: "sans-serif" }}>
              <span style={{ fontSize: 12, color: "#c19748", flex: 1 }}>⚠ You left Settings without saving — changes were not applied.</span>
              <button onClick={() => { setPage("settings"); setUnsavedWarning(false); }} style={{ background: "none", border: "1px solid #c19748", borderRadius: 4, color: "#c19748", fontSize: 11, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>Go back</button>
              <button onClick={() => setUnsavedWarning(false)} style={{ background: "none", border: "none", color: "#5a4f38", fontSize: 16, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
          )}
        </div>
      </div>

      {page === "settings" ? <SettingsPage settings={settings} onSave={handleSaveSettings} onExport={handleExport} onImport={handleImport} />
      : page === "customers" ? (
        <CustomersPage
          customers={customers}
          estimates={estimateHistory}
          onSave={saveCustomer}
          onDelete={deleteCustomer}
          onLoad={loadEstimate}
          onMerge={mergeCustomers}
          onUpdate={updateEstimateRecord}
          onDeleteEstimate={deleteEstimateRecord}
          onOpenShoppingList={setShoppingListFor}
        />
      )
      : page === "history"  ? (
        <HistoryPage
          estimateHistory={estimateHistory}
          drafts={drafts}
          customers={customers}
          settings={settings}
          shoppingListsById={shoppingListsById}
          onOpenShoppingList={setShoppingListFor}
          onClear={() => { dbClear("estimates").then(() => setEstimateHistory([])); }}
          onUpdate={updateEstimateRecord}
          onDelete={deleteEstimateRecord}
          onLoad={loadEstimate}
          onDeleteDraft={deleteDraft}
          onLoadDraft={loadEstimate}
          onSendDraft={sendDraft}
        />
      )
      : page === "accounting" ? (
        <AccountingPage estimateHistory={estimateHistory} onUpdate={updateEstimateRecord} onLoad={loadEstimate} onDelete={deleteEstimateRecord} onOpenShoppingList={setShoppingListFor} />
      )
      : page === "help"     ? <HelpPage />
      : (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* 00 — Customer */}
          <Section label="00" title="Customer">
            {/* Customer picker */}
            {customers.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <select
                  value={customerName}
                  onChange={e => {
                    const selected = customers.find(c => c.name === e.target.value);
                    if (selected) {
                      setCustomerName(selected.name || "");
                      setCustomerEmail(selected.email || "");
                      setCustomerPhone(selected.phone || "");
                    } else {
                      setCustomerName(""); setCustomerEmail(""); setCustomerPhone("");
                    }
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">— Select existing customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.phone ? "  •  " + c.phone : ""}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Customer Name</div>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Sarah & Tom Williams" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Project Description</div>
                <input value={projectDesc} onChange={e => {
                    const v = e.target.value;
                    setProjectDesc(v);
                    // Clearing the field resumes auto-fill from the selected job type(s).
                    projectDescManualRef.current = v.trim() !== "";
                  }}
                  placeholder="Master Bath Floor & Shower" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Email</div>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="sarah@email.com" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Phone</div>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="(555) 867-5309" style={inputStyle} />
              </div>
            </div>

            {/* Auto-save status — customer is saved automatically as name/email/phone are entered */}
            {duplicateCandidate ? (
              <div style={{
                marginTop: 4, padding: "10px 12px", border: "1px solid #6b5f38", borderRadius: 6,
                background: "rgba(212,196,154,0.06)",
              }}>
                <div style={{ fontSize: 12, color: "#d4c49a", fontFamily: "sans-serif", marginBottom: 8 }}>
                  This {duplicateCandidate.matchField === "phone" ? "phone number" : "email"} matches an existing customer — <strong>{duplicateCandidate.name}</strong>. Merge into them, or save as a separate customer?
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={resolveDuplicateMerge} style={{
                    padding: "6px 12px", background: "#3a3020", border: "1px solid #6b5f38", borderRadius: 6,
                    cursor: "pointer", color: "#e8c870", fontSize: 12, fontFamily: "sans-serif",
                  }}>Merge into {duplicateCandidate.name.split(" ")[0]}</button>
                  <button onClick={resolveDuplicateAsNew} style={{
                    padding: "6px 12px", background: "none", border: "1px solid #3a3020", borderRadius: 6,
                    cursor: "pointer", color: "#8a7d65", fontSize: 12, fontFamily: "sans-serif",
                  }}>Save as new customer</button>
                </div>
              </div>
            ) : customerName.trim() && (
              <div style={{ fontSize: 11, color: "#7a9b7a", fontFamily: "sans-serif", marginTop: 2 }}>
                {customers.some(c => (c.name || "").trim().toLowerCase() === customerName.trim().toLowerCase())
                  ? "✓ Saved to customers"
                  : "Saving to customers…"}
              </div>
            )}
          </Section>

          {/* 01 */}
          <Section label="01" title="Areas">
            <div style={{ fontSize: 12, color: "#6b5f4a", marginBottom: 14 }}>
              A job can have several areas — Kitchen Floor, Backsplash, Shower — each with its own sqft, tile, and services. One combined price for the whole job.
            </div>
            {areas.map((a, idx) => (
              <AreaCard
                key={a.id}
                index={idx}
                input={a}
                computed={computedAreas[idx]}
                settings={settings}
                expanded={expandedAreaId === a.id}
                onToggleExpand={() => setExpandedAreaId(p => p === a.id ? null : a.id)}
                onUpdate={patch => updateArea(a.id, patch)}
                onRemove={() => removeArea(a.id)}
                canRemove={areas.length > 1}
                onSelectTile={t => selectTile(a.id, t)}
                onSelectJobType={jt => selectJobType(a.id, jt)}
                onToggleService={svId => toggleService(a.id, svId)}
                onSetOverride={(svId, cId, val) => setOverride(a.id, svId, cId, val)}
                getOverride={(svId, cId, def) => getOverride(a, svId, cId, def)}
              />
            ))}
            <button onClick={addArea} style={{
              width: "100%", padding: 14, background: "none", border: "1px dashed #c19748",
              borderRadius: 8, color: "#c19748", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "sans-serif", marginTop: 4,
            }}>+ Add Area</button>

            {areas.length > 1 && (
              <div style={{ marginTop: 16, background: "#161208", border: "1px solid #2e2518", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", fontFamily: "sans-serif" }}>
                <span style={{ fontSize: 12, color: "#8a7d65" }}>Combined Area Subtotal ({areas.length} areas)</span>
                <span style={{ fontSize: 14, color: "#c19748", fontWeight: 700 }}>{fmt(areasSubtotal)}</span>
              </div>
            )}
          </Section>


          {/* 04 — Job Notes */}
          <Section label="02" title="Job Notes">
            <textarea
              placeholder="Scope details, customer requests, site conditions, special instructions…"
              value={jobNotes}
              onChange={e => setJobNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontSize: 13, fontFamily: "sans-serif" }}
            />
            <div style={{ fontSize: 11, color: "#4a4030", marginTop: 6, fontFamily: "sans-serif" }}>Included on the estimate when you send it to the customer.</div>
          </Section>

          {/* 05 */}
          <Section label="03" title="Customer Pricing">
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

          {calcNudge && (
            <div style={{ background: "#1e1408", border: "1px solid #c19748", borderRadius: 6, padding: "10px 14px", marginBottom: 10, fontFamily: "sans-serif", fontSize: 13, color: "#c19748" }}>
              {areas.some(a => !nv(a.sqft)) && areas.some(a => !a.tileId)
                ? "⚠ Every area needs a square footage and a tile type to calculate."
                : areas.some(a => !nv(a.sqft))
                ? "⚠ Enter the square footage for every area to calculate."
                : "⚠ Select a tile type for every area to calculate."}
            </div>
          )}
          <button onClick={handleCalculate} style={{
            width: "100%", padding: "18px", marginTop: 8,
            background: canCalculate ? "linear-gradient(135deg,#c19748,#a07830)" : "#1c1812",
            border: "none", borderRadius: 8, cursor: "pointer",
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
                  {computedAreas.map((ca, idx) => {
                    const { input, tile, area: caArea, linearFeet: caLinearFeet, wastePct: caWastePct, tileWithWaste: caTileWithWaste,
                      tileCostPerSqFt: caTileCostPerSqFt, tileCost: caTileCost, laborRate: caLaborRate, laborCost: caLaborCost,
                      thinsetC: caThinsetC, groutC: caGroutC, thinsetCost: caThinsetCost, groutCost: caGroutCost, enabledServices: caServices } = ca;
                    return (
                      <div key={input.id}>
                        {areas.length > 1 && (
                          <div style={{ padding: "10px 24px 4px", fontSize: 12, color: "#c19748", fontFamily: "sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {areaLabel(input, tile, idx, settings.jobTypes)} — {caArea} sqft
                          </div>
                        )}
                        {caTileCostPerSqFt > 0
                          ? <LineItem label={`Tile — ${tile.name} (${caTileWithWaste.toFixed(0)} sqft w/ ${(caWastePct*100).toFixed(0)}% waste @ $${caTileCostPerSqFt}/sqft)`} value={caTileCost} />
                          : <LineItem label={`Tile — ${tile?.name || "—"} (not included)`} value={0} dim />
                        }
                        <LineItem label={`Labor — ${tile?.name || "—"} (${caArea} sqft × $${caLaborRate}/sqft)`} value={caLaborCost} />
                        {caThinsetC && <LineItem label={`Thinset (${materialUnits(caThinsetC, caArea, caLinearFeet, caWastePct)} ${pluralUnit(unitLabelOf(caThinsetC), materialUnits(caThinsetC, caArea, caLinearFeet, caWastePct))} × $${nv(caThinsetC.bagPrice)})`} value={caThinsetCost} />}
                        {caGroutC   && <LineItem label={`Grout (${materialUnits(caGroutC, caArea, caLinearFeet, caWastePct)} ${pluralUnit(unitLabelOf(caGroutC), materialUnits(caGroutC, caArea, caLinearFeet, caWastePct))} × $${nv(caGroutC.bagPrice)})`}     value={caGroutCost} />}
                        {caServices.map(sv => {
                          const assignedC = sv.consumableIds.map(cId => settings.consumables.find(c => c.id === cId)).filter(Boolean);
                          const laborOv = parseFloat(getOverride(input, sv.id, "__labor__", sv.laborPerSqFt)) || 0;
                          return (
                            <div key={sv.id}>
                              <LineItem label={sv.name} value={ca.getServiceCost(sv)} section />
                              <LineItem label={`  ↳ Labor ($${laborOv}/sqft)`} value={laborOv * caArea} indent />
                              {assignedC.map(c => {
                                const ov = getOverride(input, sv.id, c.id, c.priceType === "bag" ? c.bagPrice : c.unitCost);
                                const effC = { ...c, bagPrice: ov, unitCost: ov };
                                return <LineItem key={c.id} label={`  ↳ ${c.name}`} value={consumableCost(effC, caArea)} indent />;
                              })}
                            </div>
                          );
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
                  Cost per sqft: {fmt(trueCost / totalSqft)} · Tile to order: {computedAreas.reduce((s, ca) => s + ca.tileWithWaste, 0).toFixed(0)} sqft
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
                  <MiniStat label="Price per sqft"     value={fmt(customerPrice / totalSqft)} />
                  <MiniStat label="True cost per sqft" value={fmt(trueCost / totalSqft)} />
                  <MiniStat label="Tile to order"      value={`${computedAreas.reduce((s, ca) => s + ca.tileWithWaste, 0).toFixed(0)} sqft`} />
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
                areas={areas}
                trueCost={trueCost}
                customerPrice={customerPrice}
                profit={profit}
                margin={margin}
                markupMode={markupMode}
                markupPercent={markupPercent}
                jobNotes={jobNotes}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                projectDesc={projectDesc}
                onEstimateSent={(emailText, smsText) => {
                  if (editingRecordType === "estimate" && editingRecordId) {
                    // Re-sending an already-sent estimate: update it in place, keep its original number.
                    const originalEstNum = estimateHistory.find(r => r.id === editingRecordId)?.estNum
                      || String(settings.estimateNumber || 1).padStart(4, "0");
                    saveEstimateToHistory(
                      originalEstNum,
                      customerName, customerEmail, customerPhone, projectDesc, customerPrice, emailText, smsText,
                      editingRecordId
                    );
                    return;
                  }
                  setSettings(p => {
                    const next = { ...p, estimateNumber: (p.estimateNumber || 1) + 1 };
                    try { localStorage.setItem("tje_settings", JSON.stringify(next)); } catch (e) {}
                    return next;
                  });
                  saveEstimateToHistory(
                    String(settings.estimateNumber || 1).padStart(4, "0"),
                    customerName, customerEmail, customerPhone, projectDesc, customerPrice, emailText, smsText
                  );
                  // A loaded draft becomes a real sent estimate — remove the draft so it isn't left behind as a duplicate.
                  if (editingRecordType === "draft" && editingRecordId) {
                    deleteDraft(editingRecordId);
                  }
                  setEditingRecordId(null); setEditingRecordType(null);
                }}
              />
              <button onClick={() => setShowPresentation(true)} style={{
                width: "100%", padding: "14px", marginBottom: 10,
                background: "linear-gradient(135deg, #1a1610, #13110d)",
                border: "1px solid #c19748", borderRadius: 8, cursor: "pointer",
                color: "#c19748", fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              }}>👁 Show Customer</button>
              <button onClick={() => {
                const draftNum = saveDraft();
                alert(`Draft ${draftNum} saved. Find it in the History tab under Drafts.`);
              }} style={{
                width: "100%", padding: "14px", marginBottom: 10, background: "transparent",
                border: "1px solid #3a7a4a", borderRadius: 8, cursor: "pointer",
                color: "#6dc47a", fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              }}>💾 Save Draft</button>
              <button onClick={resetEstimate} style={{
                width: "100%", padding: "14px", background: "transparent",
                border: "1px solid #2e2518", borderRadius: 8, cursor: "pointer",
                color: "#6b5f4a", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase",
              }}>Start New Estimate</button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        display: "flex", background: "#1a1208", borderTop: "1px solid #3a2e1a",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {[
          ["estimate",  "📐", "Estimate"],
          ["customers", "👥", "Customers"],
          ["history",   "📋", "History"],
          ["accounting","📊", "Accounting"],
          ["settings",  "⚙",  "Settings"],
        ].map(([key, icon, label]) => {
          const active = page === key;
          return (
            <button key={key} onClick={() => {
              if (key !== "settings" && page === "settings") setUnsavedWarning(true);
              setPage(key);
            }} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "10px 4px 8px", border: "none", cursor: "pointer", fontFamily: "sans-serif",
              background: active ? "rgba(193,151,72,0.10)" : "transparent",
              borderTop: active ? "2px solid #c19748" : "2px solid transparent",
              marginTop: -1,
            }}>
              <span style={{ fontSize: 19, filter: active ? "none" : "grayscale(35%) opacity(0.65)" }}>{icon}</span>
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: 0.3,
                color: active ? "#c19748" : "#8a7d5e",
              }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ─── Send Estimate ───────────────────────────────────────────
function SendEstimateButtons({ settings, areas, trueCost, customerPrice, profit, margin,
  markupMode, markupPercent, jobNotes, customerName, customerEmail, customerPhone,
  projectDesc, onEstimateSent }) {

  const [showPreview, setShowPreview]     = useState(false);
  const [sendMode, setSendMode]           = useState(null);
  const [estimateStyle, setEstimateStyle] = useState("itemized");
  const [terms, setTerms]                 = useState(settings.defaultTerms || "");
  const [sent, setSent]                   = useState(false);
  const [sending, setSending]             = useState(false);

  const fmt = v => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const c       = settings.contractor || {};
  const estNum  = String(settings.estimateNumber || 1).padStart(4, "0");
  const nextNum = String((settings.estimateNumber || 1) + 1).padStart(4, "0");
  const today   = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const computed = areas.map(a => ({ input: a, ...computeAreaCost(a, settings) }));
  const totalSqft = areas.reduce((s, a) => s + nv(a.sqft), 0);
  const multiArea = computed.length > 1;
  const allServiceNames = [...new Set(computed.flatMap(ca => ca.enabledServices.map(sv => sv.name)))];
  const knownCost = computed.reduce((s, ca) => s + ca.subtotal, 0);
  const miscCost = trueCost - knownCost;
  const ratio = trueCost > 0 ? customerPrice / trueCost : 1;
  const mp = cost => fmt(cost * ratio);
  const firstName = customerName ? customerName.split(" ")[0] : "";

  // ── Itemized style: full line-by-line breakdown, one block per area ──
  function buildEmailBody() {
    const L = [];
    if (c.companyName || c.contactName) {
      L.push(c.companyName || c.contactName);
      if (c.companyName && c.contactName) L.push(c.contactName);
      if (c.phone)   L.push(c.phone);
      if (c.email)   L.push(c.email);
      if (c.website) L.push(c.website);
      L.push("");
    }
    L.push(today);
    L.push("Estimate #" + estNum);
    L.push("");
    L.push(firstName ? "Hi " + firstName + "," : "Hello,");
    L.push("");
    if (projectDesc) {
      L.push("Thank you for the opportunity to quote your " + projectDesc + " project. I’ve put together a detailed estimate below and would love to get started!");
    } else {
      L.push("Thank you for reaching out! I’ve put together a detailed estimate for your tile installation project and would love to get started.");
    }
    L.push("");

    L.push("PROJECT DETAILS");
    L.push("─────────────────────────────────────");
    L.push("  Total Area: " + totalSqft + " square feet" + (multiArea ? " across " + computed.length + " areas" : ""));
    if (allServiceNames.length > 0) L.push("  Includes:  " + allServiceNames.join(", "));
    if (jobNotes && jobNotes.trim()) {
      L.push("");
      L.push("  Notes: " + jobNotes.trim().replace(/\n/g, "  "));
    }
    L.push("");

    L.push("WHAT’S INCLUDED");
    L.push("─────────────────────────────────────");
    computed.forEach((ca, idx) => {
      const { tile, area, tileWithWaste, tileCostPerSqFt, tileCost, laborCost, thinsetC, groutC, thinsetCost, groutCost, enabledServices, input } = ca;
      const tileSupplied = !tileCostPerSqFt || tileCostPerSqFt === 0;
      if (multiArea) {
        L.push("");
        L.push("  " + areaLabel(input, tile, idx, settings.jobTypes) + " (" + area + " sqft)");
      }
      if (!tileSupplied) {
        L.push("  " + (tile?.name || "Tile") + " (" + tileWithWaste.toFixed(0) + " sqft)   " + mp(tileCost));
      } else {
        L.push("  Tile material — customer supplied");
      }
      if (tile) L.push("  " + tile.name + " installation   " + mp(laborCost));
      if (thinsetC && thinsetCost > 0) L.push("  " + thinsetC.name + "   " + mp(thinsetCost));
      if (groutC && groutCost > 0) L.push("  " + groutC.name + "   " + mp(groutCost));
      enabledServices.forEach(sv => {
        const st = input.serviceState[sv.id] || {};
        L.push("");
        L.push("  " + sv.name + "   " + mp(ca.getServiceCost(sv)));
        (sv.consumableIds || []).forEach(cId => {
          const cons = settings.consumables.find(x => x.id === cId);
          if (!cons) return;
          const ovVal = st.overrides?.[cId];
          const effectiveC = ovVal !== undefined ? { ...cons, bagPrice: ovVal, unitCost: ovVal } : cons;
          const qty = cons.priceType === "flat" ? nv(st.overrides?.["qty__" + cId], 1) : 1;
          const lineCost = consumableCost(effectiveC, area, ca.linearFeet, ca.wastePct, qty);
          if (lineCost > 0) L.push("    • " + cons.name);
        });
      });
    });
    if (miscCost > 0.01) { L.push(""); L.push("  Supplies & sundries   " + mp(miscCost)); }

    L.push("");
    L.push("─────────────────────────────────────");
    L.push("  TOTAL:          " + fmt(customerPrice));
    L.push("  Price per sqft: " + fmt(customerPrice / (totalSqft || 1)));
    L.push("─────────────────────────────────────");
    L.push("");

    if (terms.trim()) {
      L.push("TERMS");
      terms.trim().split("\n").forEach(t => L.push("  " + t));
      L.push("");
    }

    L.push("I’m confident in the quality of my work and stand behind every job I do. If you have any questions or’d like to discuss anything, don’t hesitate to give me a call — I’m happy to walk you through it.");
    L.push("");
    L.push("Looking forward to working with you" + (firstName ? ", " + firstName : "") + "!");
    L.push("");
    if (c.contactName) L.push(c.contactName);
    if (c.companyName) L.push(c.companyName);
    if (c.phone)       L.push(c.phone);
    if (c.email)       L.push(c.email);
    return L.join("\n");
  }

  function buildSMSBody() {
    const L = [];
    if (c.companyName) L.push(c.companyName);
    L.push("Estimate #" + estNum + " — " + today);
    L.push("");
    if (firstName) {
      L.push("Hi " + firstName + "! " + (projectDesc ? "Here’s your estimate for " + projectDesc + "." : "Here’s your tile installation estimate."));
    } else {
      L.push(projectDesc ? "Estimate for " + projectDesc + ":" : "Tile installation estimate:");
    }
    L.push("");
    L.push(totalSqft + " sqft" + (multiArea ? " across " + computed.length + " areas" : " — " + (computed[0]?.tile?.name || "Tile") + " installation"));
    if (allServiceNames.length > 0) L.push("Includes: " + allServiceNames.join(", "));
    L.push("");

    computed.forEach((ca, idx) => {
      const { input, tile, area, tileWithWaste, tileCostPerSqFt, tileCost, laborCost, thinsetC, groutC, thinsetCost, groutCost, enabledServices } = ca;
      const tileSupplied = !tileCostPerSqFt || tileCostPerSqFt === 0;
      if (multiArea) L.push(areaLabel(input, tile, idx, settings.jobTypes) + " (" + area + " sqft):");
      if (!tileSupplied) L.push("Tile material        " + mp(tileCost));
      if (tile)          L.push("Installation         " + mp(laborCost));
      if (thinsetC && thinsetCost > 0) L.push(thinsetC.name + "     " + mp(thinsetCost));
      if (groutC && groutCost > 0) L.push(groutC.name + "                " + mp(groutCost));
      enabledServices.forEach(sv => L.push(sv.name + "   " + mp(ca.getServiceCost(sv))));
    });
    if (miscCost > 0.01) L.push("Supplies             " + mp(miscCost));
    L.push("─────────────────────");
    L.push("TOTAL: " + fmt(customerPrice) + " (" + fmt(customerPrice / (totalSqft || 1)) + "/sqft)");
    if (jobNotes && jobNotes.trim()) {
      L.push("");
      L.push("Note: " + jobNotes.trim().replace(/\n/g, " "));
    }
    if (terms.trim()) {
      L.push("");
      L.push("Terms: " + terms.trim().split("\n")[0] + (terms.trim().split("\n").length > 1 ? " (...)" : ""));
    }
    L.push("");
    L.push("Questions? Give me a call" + (c.phone ? " — " + c.phone : "!"));
    L.push("Looking forward to working with you" + (firstName ? ", " + firstName : "") + "!");
    return L.join("\n");
  }

  // ── Basic style: one summary line per area (Materials/Labor/Services), then one combined total ──
  function buildBasicEmailBody() {
    const L = [];
    if (c.companyName || c.contactName) {
      L.push(c.companyName || c.contactName);
      if (c.companyName && c.contactName) L.push(c.contactName);
      if (c.phone)   L.push(c.phone);
      if (c.email)   L.push(c.email);
      if (c.website) L.push(c.website);
      L.push("");
    }
    L.push(today);
    L.push("Estimate #" + estNum);
    L.push("");
    L.push(firstName ? "Hi " + firstName + "," : "Hello,");
    L.push("");
    if (projectDesc) {
      L.push("Thank you for the opportunity to quote your " + projectDesc + " project — I’d love to make this happen for you!");
    } else {
      L.push("Thank you for reaching out! I’d love to get started on your tile project.");
    }
    L.push("");

    L.push("Here’s a quick overview:");
    L.push("  " + totalSqft + " square feet" + (multiArea ? " across " + computed.length + " areas" : " — " + (computed[0]?.tile?.name || "tile") + " installation"));
    if (allServiceNames.length > 0) L.push("  Additional work: " + allServiceNames.join(", "));
    if (jobNotes && jobNotes.trim()) L.push("  " + jobNotes.trim().replace(/\n/g, "  "));
    L.push("");

    L.push("ESTIMATE SUMMARY");
    L.push("─────────────────────────────────────");
    computed.forEach((ca, idx) => {
      const { input, tile, area, tileCostPerSqFt, laborCost, thinsetCost, groutCost, servicesCost, tileCost } = ca;
      const tileSupplied = !tileCostPerSqFt || tileCostPerSqFt === 0;
      const matCost = (tileSupplied ? 0 : tileCost) + thinsetCost + groutCost;
      const label = multiArea ? areaLabel(input, tile, idx, settings.jobTypes) + " (" + area + " sqft)" : "Materials";
      L.push("  " + label);
      L.push("    Materials  " + (tileSupplied && matCost === 0 ? "Customer supplied" : mp(matCost)));
      L.push("    Labor      " + mp(laborCost));
      if (servicesCost > 0) L.push("    Services   " + mp(servicesCost));
    });
    L.push("─────────────────────────────────────");
    L.push("  TOTAL                " + fmt(customerPrice));
    L.push("  Per square foot      " + fmt(customerPrice / (totalSqft || 1)));
    L.push("─────────────────────────────────────");
    L.push("");

    if (terms.trim()) {
      L.push("TERMS");
      terms.trim().split("\n").forEach(t => L.push("  " + t));
      L.push("");
    }

    L.push("I take pride in delivering clean, quality work on every job. If you have any questions or want to talk through the details, give me a call — I’m always happy to chat.");
    L.push("");
    L.push("Looking forward to working with you" + (firstName ? ", " + firstName : "") + "!");
    L.push("");
    if (c.contactName) L.push(c.contactName);
    if (c.companyName) L.push(c.companyName);
    if (c.phone)       L.push(c.phone);
    if (c.email)       L.push(c.email);
    return L.join("\n");
  }

  function buildBasicSMSBody() {
    const L = [];
    if (c.companyName) L.push(c.companyName);
    L.push("Estimate #" + estNum + " — " + today);
    L.push("");
    if (firstName) {
      L.push("Hi " + firstName + "! " + (projectDesc ? "Here’s your estimate for " + projectDesc + "." : "Here’s your tile estimate."));
    } else {
      L.push(projectDesc ? "Estimate for " + projectDesc + ":" : "Tile installation estimate:");
    }
    L.push("");
    L.push(totalSqft + " sqft" + (multiArea ? " across " + computed.length + " areas" : " — " + (computed[0]?.tile?.name || "Tile") + " installation"));
    if (allServiceNames.length > 0) L.push("Includes: " + allServiceNames.join(", "));
    if (jobNotes && jobNotes.trim()) L.push("Note: " + jobNotes.trim().replace(/\n/g, " "));
    L.push("");
    computed.forEach((ca, idx) => {
      const { input, tile, area, tileCostPerSqFt, laborCost, thinsetCost, groutCost, servicesCost, tileCost } = ca;
      const tileSupplied = !tileCostPerSqFt || tileCostPerSqFt === 0;
      const matCost = (tileSupplied ? 0 : tileCost) + thinsetCost + groutCost;
      if (multiArea) L.push(areaLabel(input, tile, idx, settings.jobTypes) + " (" + area + " sqft)");
      L.push("Materials       " + (tileSupplied && matCost === 0 ? "Customer supplied" : mp(matCost)));
      L.push("Labor           " + mp(laborCost));
      if (servicesCost > 0) L.push("Services        " + mp(servicesCost));
    });
    L.push("─────────────────────");
    L.push("TOTAL: " + fmt(customerPrice) + " (" + fmt(customerPrice / (totalSqft || 1)) + "/sqft)");
    if (terms.trim()) {
      L.push("");
      L.push("Terms: " + terms.trim().split("\n")[0] + (terms.trim().split("\n").length > 1 ? " (...)" : ""));
    }
    L.push("");
    L.push("Questions? Give me a call" + (c.phone ? " — " + c.phone : "!"));
    L.push("Looking forward to working with you" + (firstName ? ", " + firstName : "") + "!");
    return L.join("\n");
  }

  function handleSend() {
    setSending(true);
    if (navigator.vibrate) navigator.vibrate(10);
    const emailText = estimateStyle === "basic" ? buildBasicEmailBody() : buildEmailBody();
    const smsText   = estimateStyle === "basic" ? buildBasicSMSBody()   : buildSMSBody();
    const body    = sendMode === "email" ? emailText : smsText;
    const subject = "Tile Installation Estimate #" + estNum + (customerName ? " — " + customerName : "");
    if (sendMode === "email") {
      const to = customerEmail ? encodeURIComponent(customerEmail) : "";
      window.open("mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body));
    } else {
      const to = customerPhone ? customerPhone.replace(/\D/g, "") : "";
      window.open("sms:" + (to ? "+" + to : "") + "?&body=" + encodeURIComponent(body));
    }
    onEstimateSent(emailText, smsText);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  const btnStyle = {
    padding: "13px", background: "#1a1208", border: "1px solid #3a2e1a",
    borderRadius: 8, cursor: "pointer", color: "#c19748",
    fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1,
  };

  if (!showPreview) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <button onClick={() => { setShowPreview(true); setSendMode("email"); }} style={btnStyle}>✉ Email Estimate</button>
        <button onClick={() => { setShowPreview(true); setSendMode("text"); }} style={btnStyle}>💬 Text Estimate</button>
      </div>
    );
  }

  const preview = estimateStyle === "basic"
    ? (sendMode === "email" ? buildBasicEmailBody() : buildBasicSMSBody())
    : (sendMode === "email" ? buildEmailBody()      : buildSMSBody());

  return (
    <div style={{ background: "#13110d", border: "1px solid #3a2e1a", borderRadius: 10, padding: "20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 700 }}>
          {sendMode === "email" ? "✉ Email Estimate" : "💬 Text Estimate"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setSendMode(m => m === "email" ? "text" : "email")} style={{
            padding: "5px 10px", background: "transparent", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif",
          }}>Switch to {sendMode === "email" ? "Text" : "Email"}</button>
          <button onClick={() => { setShowPreview(false); setSendMode(null); }} style={{
            padding: "5px 10px", background: "transparent", border: "1px solid #3a2e1a",
            borderRadius: 6, cursor: "pointer", color: "#8a7d65", fontSize: 11, fontFamily: "sans-serif",
          }}>✕ Cancel</button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Estimate Style</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["itemized", "Itemized", "Every line item broken out"], ["basic", "Basic", "Materials · Labor · Services"]].map(([val, label, desc]) => (
            <button key={val} onClick={() => setEstimateStyle(val)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 6, cursor: "pointer", textAlign: "left",
              border: `1px solid ${estimateStyle === val ? "#c19748" : "#2e2518"}`,
              background: estimateStyle === val ? "#1e1a10" : "#13110d",
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 12, color: estimateStyle === val ? "#c19748" : "#8a7d65", fontFamily: "sans-serif", fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 10, color: estimateStyle === val ? "#8a7d65" : "#3a3020", fontFamily: "sans-serif", marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {(customerName || projectDesc) && (
        <div style={{ background: "#0f0d0a", border: "1px solid #2e2518", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
          {customerName && <div style={{ fontSize: 13, color: "#d4c49a", fontFamily: "sans-serif", fontWeight: 600 }}>{customerName}</div>}
          {projectDesc && <div style={{ fontSize: 12, color: "#8a7d65", fontFamily: "sans-serif", marginTop: 2 }}>{projectDesc}</div>}
          {customerEmail && <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{customerEmail}</div>}
          {customerPhone && <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif" }}>{customerPhone}</div>}
        </div>
      )}

      {sendMode === "email" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Terms (editable)</div>
          <textarea value={terms} onChange={e => setTerms(e.target.value)}
            rows={4} style={{ ...iStyle, resize: "vertical", lineHeight: 1.7, fontSize: 12 }} />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#4a4030", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Preview</div>
        <div style={{ background: "#0a0907", border: "1px solid #2e2518", borderRadius: 6, padding: "12px 14px",
          fontSize: 11, color: "#8a7d65", fontFamily: "monospace", lineHeight: 1.8,
          whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto" }}>
          {preview}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#5a4f38", fontFamily: "sans-serif", marginBottom: 14, fontStyle: "italic" }}>
        Estimate #{estNum} · Sending will increment to #{nextNum}
      </div>

      <button onClick={handleSend} disabled={sending} style={{
        width: "100%", padding: "14px", background: sent ? "#162010" : "#1e1608",
        border: `1px solid ${sent ? "#6dc47a" : "#c19748"}`, borderRadius: 8, cursor: sending ? "wait" : "pointer",
        color: sent ? "#6dc47a" : "#c19748", fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1,
        transition: "all 0.2s",
      }}>
        {sending ? "Opening…"
          : sent ? "✓ Opened — check your " + (sendMode === "email" ? "mail app" : "messages app")
          : (sendMode === "email" ? "Open in Mail App →" : "Open in Messages App →")}
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
      title: "Step 1 — Areas",
      icon: "🏘️",
      content: [
        { type: "p", text: "A job can be made of one or several Areas — Kitchen Floor, Backsplash, Shower, etc. Each Area has its own Job Type, Square Footage, Tile Type, Thinset/Grout, and Services." },
        { type: "p", text: "Tap \"+ Add Area\" for jobs with more than one space. There's one combined customer price for the whole job, but the sent estimate and proposal break out each Area separately so the customer sees exactly what's covered where." },
        { type: "p", text: "Tap an Area's header to expand or collapse it. Remove an Area with the button at the bottom of its card — there's always at least one Area." },
      ],
    },
    {
      title: "Step 2 — Job Type (optional)",
      icon: "🏠",
      content: [
        { type: "p", text: "Pick a preset like Kitchen Floor, Backsplash, or Shower and it auto-checks the services that job usually needs further down in that Area — nothing you've already checked gets unchecked." },
        { type: "p", text: "This step is entirely optional. Skip it and pick services yourself if you'd rather — the estimate works exactly the same either way." },
        { type: "p", text: "Manage your own presets in Settings → Job Types." },
      ],
    },
    {
      title: "Step 3 — Square Footage",
      icon: "📐",
      content: [
        { type: "p", text: "Enter the area of this specific Area in square feet. This number drives every per-sqft calculation for that Area." },
        { type: "h", text: "Tips" },
        { type: "bullets", items: [
          "Measure length × width for rectangular rooms",
          "For L-shaped or irregular spaces, break them into rectangles and add the totals",
          "Enter the net tile area — waste is added separately in the Tile Type step",
        ]},
      ],
    },
    {
      title: "Step 4 — Tile Type",
      icon: "⬜",
      content: [
        { type: "p", text: "Select the type of tile being installed in this Area. This sets the labor rate for that Area." },
        { type: "h", text: "Tile Cost Per Sqft" },
        { type: "p", text: "Enter what you paid for the tile per sqft. Leave it at 0 if the customer supplied the tile or it hasn't been purchased yet — it will show as not included in the breakdown." },
        { type: "h", text: "Waste %" },
        { type: "p", text: "The waste percentage accounts for cuts, breakage, and pattern matching. The app calculates how many sqft to order automatically." },
        { type: "bullets", items: [
          "Standard install — 10%",
          "Diagonal or pattern layout — 15%",
          "Complex cuts or large format — 15–20%",
        ]},
        { type: "h", text: "Thinset & Grout" },
        { type: "p", text: "If you've tagged more than one brand in Settings → Consumables & Rates, dropdowns appear here to pick which one to use for this Area." },
      ],
    },
    {
      title: "Step 5 — Additional Services",
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
      title: "Step 6 — Customer Pricing",
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
        { type: "h", text: "Role (Thinset / Grout)" },
        { type: "p", text: "Tag a material as Thinset or Grout to make it selectable per job. Tag as many brands as you stock — a dropdown appears on the estimator so you can pick which one to use for each specific job." },
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
      title: "Settings — Job Types",
      icon: "🏠",
      content: [
        { type: "p", text: "A Job Type is a named shortcut — Kitchen Floor, Backsplash, Shower, or any preset you create. It has no cost of its own." },
        { type: "h", text: "Setting One Up" },
        { type: "bullets", items: [
          "Give it a name and icon",
          "Tap the service pill buttons to assign the services that job usually needs",
          "Selecting this Job Type on the estimator auto-checks those services — you can still add or remove any service by hand afterward",
        ]},
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
      title: "Shopping List",
      icon: "🛒",
      content: [
        { type: "p", text: "Every sent estimate and saved draft has a 🛒 List button in its History row. Tapping it builds a materials buy-list straight from that job — no re-entry needed." },
        { type: "h", text: "What's Included" },
        { type: "p", text: "The tile itself (with waste already factored in), thinset and grout, and every material assigned to a service you turned on for that job — each with the quantity you'd actually need to purchase (bags, boxes, sheets, etc. rounded up to whole units)." },
        { type: "h", text: "Checking Off Items" },
        { type: "p", text: "Tap any line to mark it purchased. Your progress is saved automatically and picks back up next time you open that job's list." },
        { type: "h", text: "Custom Items" },
        { type: "p", text: "Anything not already in your pricing setup — an extra tool, a one-off material — can be added with a name, quantity, and cost." },
        { type: "h", text: "Exporting" },
        { type: "p", text: "The Export List button downloads a plain-text list with checkboxes, quantities, and costs — easy to print, text to yourself, or hand to whoever's picking up the order." },
        { type: "h", text: "Job Status" },
        { type: "p", text: "Sent estimates show a Job Status badge — Awaiting Approval, Approved, Complete, or Declined. Set it yourself from the buttons in the expanded estimate view; it never changes on its own." },
        { type: "h", text: "Materials Status" },
        { type: "p", text: "A second badge — Need to Buy or All Purchased — appears automatically once a job has a shopping list. It just reflects your checkboxes, so it's always in sync without any extra work." },
      ],
    },
    {
      title: "Version History",
      icon: "📝",
      content: [
        { type: "bullets", items: [
          "v1.13.0 — Customer Name, Email, and Phone now save automatically as you type (no more \"Save as new customer\" button) — updates the matching customer if the name matches one you already have, or creates a new one. If the phone or email matches an existing customer but the name doesn't, you'll get a Merge / Save as new prompt instead of a silent duplicate. Project Description now auto-fills from the Job Type(s) selected on your area(s) — e.g. \"Kitchen Floor & Shower\" — until you type your own description; clearing the field resumes auto-fill. New ⇄ Merge action on the Customer tab lets you fold one customer into another, moving all their estimates over and removing the duplicate. Clicking into any sent estimate — from History, Accounting, or the Customer tab — now shows the exact same thing and offers the exact same actions: status badges, Charged/Cost/Profit/Margin, a status picker, Resend, Load into Estimator, Shopping List, Edit, Delete, and the full Line Items. Completed jobs stay locked (no Load, no Edit) everywhere, same as always",
          "v1.12.0 — Loading a sent estimate or draft and re-saving/re-sending it now updates that same record instead of creating a duplicate; sending a loaded draft removes the original. Accounting now only counts jobs marked Complete, and adds a Missed Opportunity $ total plus Uncompleted Jobs count. Accounting job rows are now tappable to expand the full cost/profit breakdown, change status, edit, or load into the estimator — split into Missed Opportunities and Completed Jobs sections. History is now three tabs — Open, Completed, Drafts — with Completed jobs locked (view-only) in both places",
          "v1.11.1 — Areas with a Job Type assigned now show that Job Type's name (Backsplash, Kitchen Floor, etc.) as their title everywhere — the live Cost Breakdown, the area card, the customer proposal, and every sent-estimate format — instead of a generic \"Area 1\" / \"Area 2\"",
          "v1.11.0 — Estimates can now be made up of multiple Areas (Kitchen Floor, Backsplash, Shower, etc.) in one job — each with its own square footage, tile, thinset/grout, and services. One combined customer price for the whole job, with the sent estimate and proposal itemizing each area separately",
          "v1.10.0 — New Job Type presets (Kitchen Floor, Backsplash, Shower, and any you add) — pick one on the estimator and it auto-checks the services that job usually needs, without unchecking anything you already picked. Materials can now be tagged as Thinset or Grout, so you can stock multiple brands and choose which one to use per job instead of always using a single fixed material — your pick is remembered on saved estimates and drafts",
          "v1.9.0 — Materials can now use a custom waste % instead of the job default; Tile Types can be assigned Required Services that auto-enable when you pick that tile on the estimator; sent estimates now save true cost, profit $, and margin % (shown as a breakdown in History); new Accounting tab with Day/Week/Month/Quarter/Year views showing net profit, total charged, total expense, average margin, a profit chart, and a searchable job list per period",
          "v1.8.0 — New Shopping List: generate a materials buy-list from any sent estimate or draft, with the tile itself, thinset/grout, and every assigned service material auto-quantified; check items off as you buy them, add custom items, and export a text list to take to the supplier. Also added Job Status for sent estimates (Awaiting Approval / Approved / Complete / Declined, set manually) and Materials Status (Need to Buy / All Purchased, tracked automatically from your shopping list checkboxes) — both shown as badges in History",
          "v1.7.0 — Materials sold by coverage (bags, boxes, sheets, rolls, etc.) now round up to whole units so costs match what you'd actually buy; added an optional per-material waste % and a new Linear Feet job input for trim/edge/cove-base materials priced by the linear foot instead of area; flat-priced materials (corners, end caps) now support a per-job quantity",
          "v1.6.0 — Materials, Tile Types, and Services redesigned as compact grouped lists with an Add/Edit popup form instead of always-expanded rows; new Share Pricing Setup export/import lets you send just your materials/tiles/services to another device with a conflict-review screen; added a Check Price button that opens Home Depot, Lowe's, or Floor & Decor search for a material or tile",
          "v1.5.0 — Redesigned navigation: bottom tab bar, Settings is now a drill-down menu, Help moved to a header button; fixed version display drift, mount-time effects now use useEffect, import now confirms before overwriting data, added a crash-recovery screen, draft counter included in backups, history cap now trims device storage too",
          "v1.4.0 — (see CHANGELOG.md on GitHub for details of this release)",
          "v1.3.0 — IndexedDB storage, Customer database, customer email to mail, full input snapshots, editable history, backup includes estimates + customers",
          "v1.2.0 — Customer Presentation Mode, logo upload, History search + expand + resend, backup reminder, history cap raised to 500",
          "v1.1.2 — Warm, sales-friendly estimate format for both Basic and Itemized; uses customer first name; confident personal closing",
          "v1.1.1 — Tab bar now scrolls horizontally on mobile — swipe to reach History and Help",
          "v1.1.0 — Job Notes, Estimate History, Install Banner, unsaved settings warning, empty state nudge, scroll to results, haptic feedback, send button loading state, Itemized vs Basic estimate style toggle",
          "v1.0.1 — Install banner guides Android and iOS users through adding app to home screen",
          "v1.0.0 — Progressive Web App: install to home screen, works fully offline; custom TJE icon; service worker caches all assets",
          "v0.3.3 — Material categories added to consumables; Services now use a grouped checklist with search instead of bubbles",
          "v0.3.2 — Added Export & Import backup buttons to Settings — save all settings to a JSON file and restore from any previous backup",
          "v0.3.1 — Settings now persist across sessions — contractor info, tile types, services, and estimate number all saved to device storage",
          "v0.3.0 — Customer-facing estimates: removed true cost and internal rates; all line items show marked-up customer prices only",
          "v0.2.9 — Fully itemized estimates: every line item broken out with quantities and unit prices",
          "v0.2.8 — Fixed black screen: React.useState used without React namespace import; corrected to useState",
          "v0.2.7 — Fixed black screen crash on Calculate; corrected prop names in send estimate component",
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
        v{APP_VERSION} — Tile Job Estimator · Built for tile contractors
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
const addBtnStyle = { width: "100%", padding: "12px", marginTop: 4, background: "transparent", border: "1px dashed #3a2e18", borderRadius: 8, cursor: "pointer", color: "#c19748", fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1 };
