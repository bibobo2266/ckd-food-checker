// src/services/localFoodDb.ts
// 讀取 /data/ckd_foods_master.csv 並用 name_local / name_en 去找
// 格式一定要對上：source,food_id,name_local,name_en,lang,category,serving_basis,energy_kcal,protein_g,phosphorus_mg,potassium_mg,sodium_mg,notes

let _cache: any[] | null = null;

async function loadLocalFoods(): Promise<any[]> {
  if (_cache) return _cache;

  const resp = await fetch('/data/ckd_foods_master.csv');
  if (!resp.ok) {
    console.warn('[ckd] failed to load local CSV:', resp.status);
    _cache = [];
    return _cache;
  }
  const text = await resp.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(',');
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row: any = {};
    header.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }

  _cache = rows;
  return rows;
}

export async function findLocalFood(query: string) {
  const q = query.trim().toLowerCase();
  const rows = await loadLocalFoods();

  // 1) exact match on name_local
  let found = rows.find((r) => (r.name_local || '').toLowerCase() === q);
  if (found) return normalize(found);

  // 2) exact match on name_en
  found = rows.find((r) => (r.name_en || '').toLowerCase() === q);
  if (found) return normalize(found);

  // 3) contains match
  found = rows.find(
    (r) =>
      (r.name_local || '').toLowerCase().includes(q) ||
      (r.name_en || '').toLowerCase().includes(q),
  );
  if (found) return normalize(found);

  return null;
}

function normalize(row: any) {
  return {
    name: row.name_local || row.name_en || 'Unknown',
    protein: row.protein_g ? Number(row.protein_g) : 0,
    phosphorus: row.phosphorus_mg ? Number(row.phosphorus_mg) : 0,
    potassium: row.potassium_mg ? Number(row.potassium_mg) : 0,
    sodium: row.sodium_mg ? Number(row.sodium_mg) : 0,
    source: row.source || 'local-asia',
    lang: row.lang || 'zh-TW',
  };
}
