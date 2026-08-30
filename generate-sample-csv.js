// generate-sample-csv.js
// Run with: node generate-sample-csv.js
// Produces: sample-data.csv in the project root

const fs   = require('fs');
const path = require('path');

const departments = ['Block A', 'Block B', 'Block C'];
const types       = ['electricity', 'water', 'waste'];
const START_DATE  = new Date('2024-01-01');
const DAYS        = 60;

// Baseline daily values per type
const baseline = {
  electricity: { 'Block A': 320, 'Block B': 280, 'Block C': 260 },
  water:       { 'Block A': 850, 'Block B': 720, 'Block C': 680 },
  waste:       { 'Block A': 45,  'Block B': 38,  'Block C': 34  },
};

// Units per type
const units = { electricity: 'kWh', water: 'L', waste: 'kg' };

// Anomaly windows (day index ranges, 0-based)
// Spike 1: Block A electricity unusually high on days 14–16
// Spike 2: Block B water unusually high on days 38–40
const anomalies = [
  { dept: 'Block A', type: 'electricity', days: [14, 15, 16], multiplier: 3.8 },
  { dept: 'Block B', type: 'water',       days: [38, 39, 40], multiplier: 4.2 },
];

function isAnomaly(dept, type, dayIndex) {
  return anomalies.find(
    (a) => a.dept === dept && a.type === type && a.days.includes(dayIndex)
  );
}

function jitter(value, pct = 0.08) {
  const range = value * pct;
  return Math.round((value + (Math.random() * 2 - 1) * range) * 10) / 10;
}

const rows = ['department,type,amount,unit,date'];

for (let d = 0; d < DAYS; d++) {
  const date = new Date(START_DATE);
  date.setDate(date.getDate() + d);
  const dateStr = date.toISOString().slice(0, 10);

  for (const dept of departments) {
    for (const type of types) {
      const base     = baseline[type][dept];
      const anomaly  = isAnomaly(dept, type, d);
      const amount   = anomaly
        ? Math.round(base * anomaly.multiplier * (1 + (Math.random() * 0.1 - 0.05)) * 10) / 10
        : jitter(base);

      rows.push(`"${dept}",${type},${amount},${units[type]},${dateStr}`);
    }
  }
}

const outPath = path.join(__dirname, 'sample-data.csv');
fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log(`✅  Generated ${rows.length - 1} rows → ${outPath}`);
