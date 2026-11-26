"""Paso 3: capas puntuales y lineales, relieve, conteos por departamento."""
import json, re, unicodedata
import numpy as np, pandas as pd, geopandas as gpd
from shapely.geometry import Point, box
RAW = '/home/claude/raw'; OUT = '/home/claude/atlas/build'
D = gpd.read_file(f'{OUT}/deptos_base.gpkg')[['id','nombre','prov','geometry']]
AR = D.dissolve().geometry.iloc[0].buffer(0.02)
BBOX = (-74.5, -56, -53, -21)  # continental + Tierra del Fuego + Malvinas

def sj(gdf):
    gdf = gdf.drop(columns=[c for c in ['id','index_right'] if c in gdf.columns])
    j = gpd.sjoin(gdf, D[['id','geometry']], how='left', predicate='within')
    j = j[~j.index.duplicated()]
    return j.rename(columns={'id':'depto'}).drop(columns=['index_right'], errors='ignore')
def pts(df, lon='lon', lat='lat'):
    return gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[lon], df[lat]), crs=4326)

layers = {}
# --- aeropuertos (OurAirports) ---
a = pd.read_csv(f'{RAW}/misc/airports.csv')
a = a[(a.iso_country=='AR') & a.type.isin(['large_airport','medium_airport','small_airport'])]
a = pts(a, 'longitude_deg', 'latitude_deg'); a = sj(a)
a['tipo'] = a['type'].map({'large_airport':'Internacional/grande','medium_airport':'Mediano','small_airport':'Pequeño'})
layers['aeropuertos'] = [{'n': r['name'], 't': r['tipo'], 'iata': r['iata_code'] if isinstance(r['iata_code'], str) else None,
    'reg': r['scheduled_service']=='yes', 'elev_m': round(r['elevation_ft']*0.3048) if pd.notna(r['elevation_ft']) else None,
    'mun': r['municipality'] if isinstance(r['municipality'], str) else None,
    'd': r['depto'], 'x': round(r.geometry.x, 4), 'y': round(r.geometry.y, 4)} for _, r in a.iterrows()]

# --- centrales eléctricas (WRI GPPD) ---
FUEL = {'Oil':'Petróleo','Gas':'Gas','Hydro':'Hidráulica','Wind':'Eólica','Coal':'Carbón','Solar':'Solar','Nuclear':'Nuclear','Other':'Otra','Biomass':'Biomasa'}
p = pd.read_csv(f'{RAW}/misc/gppd.csv', low_memory=False); p = p[p.country=='ARG']
p = sj(pts(p, 'longitude', 'latitude'))
layers['centrales'] = [{'n': r['name'], 'f': FUEL.get(r['primary_fuel'], r['primary_fuel']), 'mw': round(r['capacity_mw'], 1),
    'anio': int(r['commissioning_year']) if pd.notna(r['commissioning_year']) else None, 'own': r['owner'] if isinstance(r['owner'], str) else None,
    'gwh': round(r['estimated_generation_gwh_2017'], 0) if pd.notna(r.get('estimated_generation_gwh_2017')) else None,
    'd': r['depto'], 'x': round(r.geometry.x, 4), 'y': round(r.geometry.y, 4)} for _, r in p.iterrows()]

# --- puertos (Natural Earth) ---
pr = gpd.read_file(f'{RAW}/ne/ne_10m_ports.geojson')
pr = pr[pr.geometry.within(AR.buffer(0.3))]
pr = sj(pr)
layers['puertos'] = [{'n': r['name'], 'd': r['depto'], 'x': round(r.geometry.x, 4), 'y': round(r.geometry.y, 4)} for _, r in pr.iterrows()]

# --- escuelas (padrón vía avdata99/WFS nacional) ---
esc = []
for nivel, fn in [('Primaria','primarias'), ('Secundaria','secundarias')]:
    s = pd.read_csv(f'{RAW}/avdata99_escuelas-argentinas/datos/full-escuelas-{fn}-resumido.csv', dtype=str)
    s['lon'] = pd.to_numeric(s['x'].str.replace(',', '.'), errors='coerce'); s['lat'] = pd.to_numeric(s['y'].str.replace(',', '.'), errors='coerce')
    s = s.dropna(subset=['lon','lat']); s['nivel'] = nivel; esc.append(s)
esc = pd.concat(esc, ignore_index=True); esc = esc[esc.provincia!='provincia']; esc = esc[(esc.lon.between(-75, -53)) & (esc.lat.between(-56, -21))]
esc = sj(pts(esc))
layers['escuelas'] = [[round(r.geometry.x, 4), round(r.geometry.y, 4), 0 if r['nivel']=='Primaria' else 1, 0 if r['sector']=='Estatal' else 1, r['nombre'], r['depto']] for _, r in esc.iterrows()]

# --- parques nacionales (Wikipedia / APN) ---
pn = pd.read_csv('/home/claude/atlas/pipeline/parques_nacionales.csv')
pn = sj(pts(pn, 'longitude', 'latitude'))
layers['parques'] = [{'n': 'Parque Nacional ' + r['name'], 'prov': r['province'], 'km2': r['area_km2'], 'anio': int(r['year_established']),
    'd': r['depto'], 'x': r['longitude'], 'y': r['latitude']} for _, r in pn.iterrows()]

# --- universidades (Wikipedia) geolocalizadas con localidades censales ---
L = pd.read_csv(f'{OUT}/localidades.csv', dtype={'code':str,'depto':str,'prov':str})
def norm(s): return unicodedata.normalize('NFKD', str(s)).encode('ascii','ignore').decode().upper().strip()
L['nn'] = L['name'].map(norm)
u = pd.read_csv('/home/claude/atlas/pipeline/universidades.csv')
BH = pd.read_csv(f'{RAW}/HackatONG-ProgramAR_Localidades-Argentinas/resources/bahra-base-final-21-05-2014.csv', dtype=str)
BH['pp'] = BH['cod_prov'].str.zfill(2); BH['nn'] = BH['nombre_bahra'].map(norm)
BH['lat'] = pd.to_numeric(BH['lat_gd']); BH['lon'] = pd.to_numeric(BH['long_gd'])
PROVN = {norm(v): k for k, v in {'02':'Ciudad Autónoma de Buenos Aires','06':'Buenos Aires','10':'Catamarca','14':'Córdoba','18':'Corrientes','22':'Chaco','26':'Chubut','30':'Entre Ríos','34':'Formosa','38':'Jujuy','42':'La Pampa','46':'La Rioja','50':'Mendoza','54':'Misiones','58':'Neuquén','62':'Río Negro','66':'Salta','70':'San Juan','74':'San Luis','78':'Santa Cruz','82':'Santa Fe','86':'Santiago del Estero','90':'Tucumán','94':'Tierra del Fuego'}.items()}
uo = []
for _, r in u.iterrows():
    pc = PROVN.get(norm(r['provincia']))
    cand = L[(L.prov==pc) & (L.nn==norm(r['localidad']))].sort_values('pob', ascending=False)
    if len(cand) == 0:
        cand = L[(L.prov==pc) & (L.nn.str.contains(norm(r['localidad']), regex=False))].sort_values('pob', ascending=False)
    if len(cand) == 0:
        b = BH[(BH.pp==pc) & (BH.nn==norm(r['localidad']))]
        if len(b) == 0: print('univ sin ubicar:', r['nombre'], r['localidad']); continue
        b = b.iloc[0]; x, y = b['lon'], b['lat']
        dd = D[D.contains(Point(x, y))]; dep = dd.id.iloc[0] if len(dd) else None
    else:
        c = cand.iloc[0]; x, y, dep = c['lon'], c['lat'], c['depto']
    uo.append({'n': r['nombre'], 't': r['tipo'], 'anio': int(r['anio']) if pd.notna(r['anio']) else None, 'loc': r['localidad'], 'd': dep, 'x': round(float(x), 4), 'y': round(float(y), 4)})
layers['universidades'] = uo

# --- localidades ---
layers['localidades'] = [[round(r['lon'], 4), round(r['lat'], 4), int(r['pob']), r['name'], r['depto'], r['code'], int(r['viv']) if pd.notna(r['viv']) else None]
                          for _, r in L.sort_values('pob', ascending=False).iterrows()]

for k, v in layers.items():
    json.dump(v, open(f'{OUT}/pt_{k}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(k, len(v))

# ---- conteos por departamento ----
cnt = {}
def add(key, deps, w=None):
    s = pd.Series(1 if w is None else w, index=range(len(deps)))
    for dep, v in pd.DataFrame({'d': deps, 'v': s}).groupby('d').v.sum().items():
        cnt.setdefault(dep, {})[key] = float(v)
add('aeropuertos', [x['d'] for x in layers['aeropuertos']])
add('centrales', [x['d'] for x in layers['centrales']]); add('potencia_mw', [x['d'] for x in layers['centrales']], [x['mw'] for x in layers['centrales']])
add('escuelas', [x[5] for x in layers['escuelas']]); add('escuelas_primarias', [x[5] for x in layers['escuelas'] if x[2]==0]); add('escuelas_secundarias', [x[5] for x in layers['escuelas'] if x[2]==1])
add('universidades', [x['d'] for x in uo]); add('puertos', [x['d'] for x in layers['puertos']])
# potencia por fuente
for f in set(x['f'] for x in layers['centrales']):
    add('mw_' + f, [x['d'] for x in layers['centrales'] if x['f']==f], [x['mw'] for x in layers['centrales'] if x['f']==f])
json.dump(cnt, open(f'{OUT}/conteos.json', 'w'))

# ---- líneas y polígonos naturales ----
clip = box(*BBOX)
def clipw(fn, keep, simp=0.01, within=None):
    g = gpd.read_file(f'{RAW}/ne/{fn}.geojson')
    g = g[g.intersects(clip)].copy(); g['geometry'] = g.intersection(clip)
    if within is not None: g = g[g.intersects(within)]; g['geometry'] = g.intersection(within)
    g = g[~g.geometry.is_empty]
    g['geometry'] = g.geometry.simplify(simp, preserve_topology=True)
    return g[[c for c in keep if c in g.columns] + ['geometry']]
ARb = AR.buffer(0.05)
clipw('ne_10m_rivers_lake_centerlines', ['name','scalerank'], 0.005).to_file(f'{OUT}/rios.geojson', driver='GeoJSON')
clipw('ne_10m_lakes', ['name'], 0.005, ARb).to_file(f'{OUT}/lagos.geojson', driver='GeoJSON')
clipw('ne_10m_glaciated_areas', ['name'], 0.003, ARb).to_file(f'{OUT}/glaciares.geojson', driver='GeoJSON')
clipw('ne_10m_railroads', ['category','name'], 0.005, ARb).to_file(f'{OUT}/ferrocarriles.geojson', driver='GeoJSON')
r = clipw('ne_10m_roads', ['type','name','label','scalerank'], 0.005, ARb)
r.to_file(f'{OUT}/rutas.geojson', driver='GeoJSON')
clipw('ne_10m_urban_areas', ['area_sqkm'], 0.002, ARb).to_file(f'{OUT}/areas_urbanas.geojson', driver='GeoJSON')
reg = gpd.read_file(f'{RAW}/ne/ne_10m_geography_regions_polys.geojson'); reg = reg[reg.intersects(AR)]
print('regiones NE:', reg.iloc[:, :6].to_string()[:3000])
# paises vecinos para contexto
w = gpd.read_file(f'{RAW}/ne/ne_10m_admin_0_countries.geojson')
w = w[w.intersects(box(-82, -60, -45, -15))][['NAME_ES','ADM0_A3','geometry']]
w['geometry'] = w.geometry.intersection(box(-82, -60, -45, -15)).simplify(0.02)
w[w.ADM0_A3!='ARG'].to_file(f'{OUT}/vecinos.geojson', driver='GeoJSON')
ep = gpd.read_file(f'{RAW}/ne/ne_10m_geography_regions_elevation_points.geojson'); ep = ep[ep.within(ARb)]
json.dump([{'n': r['name'], 'elev': r['elevation'], 'x': round(r.geometry.x, 3), 'y': round(r.geometry.y, 3)} for _, r in ep.iterrows()], open(f'{OUT}/pt_cumbres.json','w'), ensure_ascii=False)
print('cumbres', len(ep))
