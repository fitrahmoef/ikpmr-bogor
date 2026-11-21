# Extract the 12 Riau regencies from geoBoundaries IDN ADM2 (simplified) into a small JSON.
# usage: python -I scripts/extract-riau.py <adm2.geojson> lib/riau-geo.json
# Source: geoBoundaries gbOpen IDN ADM2 (BPS, WFP, OCHA ROAP), CC BY 3.0 IGO.
import json, sys

src, dst = sys.argv[1], sys.argv[2]
KEYS = {
    'pekanbaru': 'Pekanbaru', 'dumai': 'Dumai', 'kampar': 'Kampar', 'rokan-hulu': 'Rokan Hulu',
    'rokan-hilir': 'Rokan Hilir', 'bengkalis': 'Bengkalis', 'meranti': 'Kepulauan Meranti', 'siak': 'Siak',
    'pelalawan': 'Pelalawan', 'inhu': 'Indragiri Hulu', 'inhil': 'Indragiri Hilir', 'kuansing': 'Kuantan Singingi',
}

def in_riau(coords):
    xs = [p[0] for p in coords]; ys = [p[1] for p in coords]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    return 99.9 < cx < 104.0 and -1.3 < cy < 2.7

def rings(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates'][0]]
    return [poly[0] for poly in geom['coordinates']]

def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def thin(r, step):
    # keep every n-th point; enough detail for a 3D overview map
    out = r[::step]
    if out[-1] != r[-1]:
        out.append(r[-1])
    return [[round(x, 3), round(y, 3)] for x, y in out]

data = json.load(open(src, encoding='utf-8'))
found = {}
for f in data['features']:
    name = f['properties']['shapeName'].replace('Kota ', '').replace('Kabupaten ', '').strip()
    for key, want in KEYS.items():
        if name.lower() == want.lower():
            rs = [r for r in rings(f['geometry']) if in_riau(r)]
            if not rs:
                continue
            # drop tiny islets so the mesh stays light
            big = max(area(r) for r in rs)
            rs = [r for r in rs if area(r) > big * 0.01]
            pts = sum(len(r) for r in rs)
            step = max(1, pts // 900)
            found[key] = {'name': f['properties']['shapeName'], 'rings': [thin(r, step) for r in rs]}

missing = [k for k in KEYS if k not in found]
print('found', len(found), 'missing', missing)
json.dump({'source': 'geoBoundaries gbOpen IDN ADM2 (BPS, WFP, OCHA ROAP), CC BY 3.0 IGO', 'regencies': found},
          open(dst, 'w', encoding='utf-8'), separators=(',', ':'))
