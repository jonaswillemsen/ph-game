#!/usr/bin/env node
// Fetch real public health figures from the OHID Fingertips API and print a
// ready-to-paste `REGIONS` array for data.js.
//
// Usage:
//   node scripts/fetch-fingertips.mjs            # print REGIONS block
//   node scripts/fetch-fingertips.mjs > out.txt  # save it
//
// No dependencies — uses the built-in global fetch (Node 18+).
//
// Data source: OHID Fingertips (https://fingertips.phe.org.uk/), area type 502
// "Upper tier local authorities (post 4/23)". For each indicator the latest
// available data period is used and the value rounded to one decimal place.

const API = "https://fingertips.phe.org.uk/api";
const CHILD_AREA_TYPE = 502; // Upper tier local authorities (post 4/23)
const PARENT_AREA_TYPE = 15; // England

// The areas in the quiz, keyed by ONS code, with their display region.
const AREAS = [
  ["E09000020", "Kensington and Chelsea", "London"],
  ["E09000033", "Westminster", "London"],
  ["E09000027", "Richmond upon Thames", "London"],
  ["E06000041", "Wokingham", "South East"],
  ["E10000030", "Surrey", "South East"],
  ["E06000023", "Bristol", "South West"],
  ["E06000052", "Cornwall", "South West"],
  ["E08000035", "Leeds", "Yorkshire and the Humber"],
  ["E08000019", "Sheffield", "Yorkshire and the Humber"],
  ["E06000010", "Kingston upon Hull", "Yorkshire and the Humber"],
  ["E08000025", "Birmingham", "West Midlands"],
  ["E08000003", "Manchester", "North West"],
  ["E08000012", "Liverpool", "North West"],
  ["E06000009", "Blackpool", "North West"],
  ["E08000021", "Newcastle upon Tyne", "North East"],
  ["E06000002", "Middlesbrough", "North East"],
  ["E06000001", "Hartlepool", "North East"],
  ["E06000018", "Nottingham", "East Midlands"],
  ["E09000030", "Tower Hamlets", "London"],
  ["E08000023", "South Tyneside", "North East"],
];

// metricKey -> { id: Fingertips indicator id, sex: row "Sex" value to keep }
const METRICS = {
  lifeExpectancyMale: { id: 90366, sex: "Male" },
  lifeExpectancyFemale: { id: 90366, sex: "Female" },
  adultObesity: { id: 93881, sex: "Persons" },
  childObesity: { id: 90323, sex: "Persons" },
  smoking: { id: 92443, sex: "Persons" },
  physicalActivity: { id: 93014, sex: "Persons" },
  cvdMortality: { id: 40401, sex: "Persons" },
  diabetes: { id: 241, sex: "Persons" },
};

const METRIC_ORDER = Object.keys(METRICS);
const WANTED = new Set(AREAS.map(([code]) => code));

// Minimal CSV parser handling quoted fields and embedded commas.
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignore
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchIndicatorCsv(id) {
  const url =
    `${API}/all_data/csv/by_indicator_id?indicator_ids=${id}` +
    `&child_area_type_id=${CHILD_AREA_TYPE}&parent_area_type_id=${PARENT_AREA_TYPE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for indicator ${id}`);
  const rows = parseCsv(await res.text());
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const col = {
    code: idx("Area Code"),
    sex: idx("Sex"),
    value: idx("Value"),
    period: idx("Time period"),
    sortable: idx("Time period Sortable"),
  };
  return rows.slice(1).map((r) => ({
    code: r[col.code],
    sex: r[col.sex],
    value: r[col.value],
    period: r[col.period],
    sortable: Number(r[col.sortable] || 0),
  }));
}

async function main() {
  const csvCache = new Map();
  // metricKey -> Map(code -> { value, period })
  const data = {};
  const periods = {};

  for (const metric of METRIC_ORDER) {
    const { id, sex } = METRICS[metric];
    if (!csvCache.has(id)) csvCache.set(id, await fetchIndicatorCsv(id));
    const best = new Map(); // code -> { sortable, period, value }
    for (const row of csvCache.get(id)) {
      if (!WANTED.has(row.code)) continue;
      if (sex && row.sex !== sex) continue;
      const v = Number(row.value);
      if (row.value === "" || Number.isNaN(v)) continue;
      const cur = best.get(row.code);
      if (!cur || row.sortable > cur.sortable) {
        best.set(row.code, { sortable: row.sortable, period: row.period, value: v });
      }
    }
    data[metric] = best;
    periods[metric] = [...new Set([...best.values()].map((b) => b.period))];
    const missing = AREAS.filter(([c]) => !best.has(c)).map(([, n]) => n);
    process.stderr.write(
      `${metric.padEnd(22)} id=${String(id).padEnd(6)} sex=${(sex || "").padEnd(8)} ` +
      `covered=${best.size}/${AREAS.length} periods=${JSON.stringify(periods[metric])}` +
      (missing.length ? ` MISSING=${JSON.stringify(missing)}` : "") + "\n"
    );
  }

  // Emit the REGIONS array. Values are shown to one decimal place to match the
  // snapshot baked into data.js.
  const round1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const lines = ["const REGIONS = ["];
  for (const [code, name, region] of AREAS) {
    const stats = METRIC_ORDER.map((m) => {
      const entry = data[m].get(code);
      return `${m}: ${entry ? round1(entry.value) : "null"}`;
    }).join(", ");
    lines.push(
      `  {\n    name: ${JSON.stringify(name)},\n    region: ${JSON.stringify(region)},` +
      `\n    code: ${JSON.stringify(code)},\n    stats: { ${stats} },\n  },`
    );
  }
  lines.push("];");
  process.stdout.write(lines.join("\n") + "\n");

  process.stderr.write("\nPeriods per metric: " + JSON.stringify(periods, null, 0) + "\n");
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
});
