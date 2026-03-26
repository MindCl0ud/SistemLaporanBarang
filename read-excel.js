const xlsx = require('xlsx');

try {
  const wb = xlsx.readFile('./BKU 2026.xlsx');
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const data = xlsx.utils.sheet_to_json(ws, { defval: "", header: 1 });
  console.log("Total rows:", data.length);
  for (let i = 0; i < 20; i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
} catch (err) {
  console.error(err);
}
