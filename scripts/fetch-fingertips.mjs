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
// Data source: OHID Fingertips (https://fingertips.phe.org.uk/). The area list
// is the full set of area type 502 "Upper tier local authorities (post 4/23)"
// — i.e. all counties, unitary authorities, metropolitan districts and London
// boroughs — minus two tiny outliers (see EXCLUDE). For each indicator the
// latest period for which every area has data is used, rounded to one decimal.

const API = "https://fingertips.phe.org.uk/api";
const CHILD_AREA_TYPE = 502; // Upper tier local authorities (post 4/23)
const PARENT_AREA_TYPE = 15; // England
const REGION_AREA_TYPE = 6; // Government Office Region (E12)

// Tiny outliers routinely excluded from area comparisons — populations in the
// hundreds/low thousands, with sparse or suppressed data for many indicators.
const EXCLUDE = new Set([
  "E09000001", // City of London
  "E06000053", // Isles of Scilly
]);

// Override which Wikipedia article an area's image lookup uses, where the plain
// display name isn't a usable article (e.g. it's a disambiguation page).
const WIKI = {
  "Kensington and Chelsea": "Royal Borough of Kensington and Chelsea",
};

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
  hypertension: { id: 219, sex: "Persons" },
  depression: { id: 848, sex: "Persons" },
  asthma: { id: 90933, sex: "Persons" },
  copd: { id: 253, sex: "Persons" },
  dementiaDiagnosis: { id: 92949, sex: "Persons" },
  lowBirthWeight: { id: 20101, sex: "Persons" },
};

const METRIC_ORDER = Object.keys(METRICS);

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

async function fetchJson(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

// Build [code, name, region, wiki?] for every area in the geography, sorted by
// name, with the tiny outliers removed and Wikipedia overrides applied.
async function buildAreas() {
  const [areas, regions, parentToChild] = await Promise.all([
    fetchJson(`/areas/by_area_type?area_type_id=${CHILD_AREA_TYPE}`),
    fetchJson(`/areas/by_area_type?area_type_id=${REGION_AREA_TYPE}`),
    fetchJson(
      `/parent_to_child_areas?parent_area_type_id=${REGION_AREA_TYPE}` +
        `&child_area_type_id=${CHILD_AREA_TYPE}`
    ),
  ]);

  const regionName = new Map(
    regions.map((r) => [r.Code, r.Name.replace(/\s*region \(statistical\)$/i, "").trim()])
  );
  const areaRegion = new Map();
  for (const [regionCode, childCodes] of Object.entries(parentToChild)) {
    for (const code of childCodes) areaRegion.set(code, regionName.get(regionCode) || "");
  }

  return areas
    .filter((a) => !EXCLUDE.has(a.Code))
    .map((a) => [a.Code, a.Name, areaRegion.get(a.Code) || "", WIKI[a.Name]])
    .sort((x, y) => x[1].localeCompare(y[1], "en"));
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
  const AREAS = await buildAreas();
  const WANTED = new Set(AREAS.map(([code]) => code));
  process.stderr.write(`Areas: ${AREAS.length}\n`);

  const csvCache = new Map();
  const data = {}; // metricKey -> Map(code -> { value, period })
  const periods = {};

  for (const metric of METRIC_ORDER) {
    const { id, sex } = METRICS[metric];
    if (!csvCache.has(id)) csvCache.set(id, await fetchIndicatorCsv(id));

    // Gather every valid value per area, keyed by period, so we can pick a
    // single period that all areas share rather than mixing periods.
    const byArea = new Map(); // code -> Map(sortable -> { period, value })
    for (const row of csvCache.get(id)) {
      if (!WANTED.has(row.code)) continue;
      if (sex && row.sex !== sex) continue;
      const v = Number(row.value);
      if (row.value === "" || Number.isNaN(v)) continue;
      if (!byArea.has(row.code)) byArea.set(row.code, new Map());
      byArea.get(row.code).set(row.sortable, { period: row.period, value: v });
    }

    // The latest period common to every covered area (fairer comparisons).
    const covered = [...byArea.values()];
    let chosen = null;
    if (covered.length) {
      const common = [...covered[0].keys()].filter((s) =>
        covered.every((m) => m.has(s))
      );
      if (common.length) chosen = Math.max(...common);
    }

    const best = new Map(); // code -> { period, value }
    for (const [code, periodsMap] of byArea) {
      // Use the common period where possible; otherwise this area's latest.
      const sortable =
        chosen !== null && periodsMap.has(chosen)
          ? chosen
          : Math.max(...periodsMap.keys());
      best.set(code, periodsMap.get(sortable));
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
  for (const [code, name, region, wiki] of AREAS) {
    const stats = METRIC_ORDER.map((m) => {
      const entry = data[m].get(code);
      return `${m}: ${entry ? round1(entry.value) : "null"}`;
    }).join(", ");
    const wikiLine = wiki ? `\n    wiki: ${JSON.stringify(wiki)},` : "";
    lines.push(
      `  {\n    name: ${JSON.stringify(name)},\n    region: ${JSON.stringify(region)},` +
      `\n    code: ${JSON.stringify(code)},${wikiLine}\n    stats: { ${stats} },\n  },`
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
