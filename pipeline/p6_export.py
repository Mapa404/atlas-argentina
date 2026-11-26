"""Paso 6: arma los archivos que consume la web (indicadores, catálogo, fuentes, geometrías)."""
import json, math, os, shutil, subprocess, unicodedata
import numpy as np, pandas as pd, geopandas as gpd
RAW = '/home/claude/raw'; B = '/home/claude/atlas/build'; W = '/home/claude/atlas/web/public/data'
os.makedirs(W, exist_ok=True)
C22 = f'{RAW}/Fabriciositto_censo_argentina_2022/datasets'

D = gpd.read_file(f'{B}/deptos_base.gpkg')
_a = D.groupby('id').area_km2.sum()
D = D.dissolve(by='id', aggfunc='first').reset_index()
D['area_km2'] = D['id'].map(_a)
D['densidad'] = D['pob2022'] / D['area_km2']
emp = json.load(open(f'{B}/empleo.json')); empd = emp['deptos']
agro = json.load(open(f'{B}/agro.json')); agd = agro['deptos']
cnt = json.load(open(f'{B}/conteos.json'))
rel = json.load(open(f'{B}/relieve.json'))
PROV_SHORT = dict(zip(D.prov, D.provincia))

def r(x, n=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))): return None
    return round(float(x), n)

SECT = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']
CULTIVOS = ['Soja','Maíz','Trigo','Girasol','Cebada','Sorgo','Maní','Arroz','Algodón','Poroto']
FUELS = ['Gas','Hidráulica','Petróleo','Eólica','Nuclear','Carbón','Solar']

# ---------------- departamentos ----------------
dep = {}
for _, x in D.iterrows():
    i = x['id']; e = empd.get(i, {}); a = agd.get(i, {}); c = cnt.get(i, {}); rl = rel.get(i, {})
    pob = x['pob2022'] if pd.notna(x['pob2022']) else None
    v = {
        'pob': r(pob, 0), 'densidad': r(x['densidad'], 1), 'var_pob': r(x['var_pob'], 1), 'pob2010': r(x['pob2010'], 0),
        'edad_mediana': r(x['edad_mediana'], 0), 'pct_0_14': r(x['pct_0_14']), 'pct_65': r(x['pct_65']),
        'dependencia': r(x['dependencia']), 'masculinidad': r(x['masculinidad']),
        'pct_rural_disp': r(x['pob_rural_dispersa'] / pob * 100 if pob else None), 'n_localidades': r(x['n_localidades'], 0),
        'viv': r(x['viv2022'], 0), 'pers_viv': r(x['personas_por_vivienda'], 2),
        'pers_cuarto10': r(x['personas_por_cuarto'], 2), 'propietarios10': r(x['propietarios_vivienda_proporcion'] * 100 if pd.notna(x['propietarios_vivienda_proporcion']) else None),
        'asist_jov10': r(x['jovenes_asistencia_escolar'] * 100 if pd.notna(x['jovenes_asistencia_escolar']) else None),
        'area': r(x['area_km2'], 0),
        'elev_media': rl.get('elev_media'), 'elev_max': rl.get('elev_max'),
        'empleo': e.get('empleo'), 'establecimientos': e.get('establecimientos'),
        'empleo_1000': r(e['empleo'] / pob * 1000 if e and pob else None),
        'escuelas': c.get('escuelas', 0), 'escuelas_10k': r(c.get('escuelas', 0) / pob * 10000 if pob else None),
        'universidades': c.get('universidades', 0), 'aeropuertos': c.get('aeropuertos', 0),
        'potencia_mw': r(c.get('potencia_mw', 0), 0), 'centrales': c.get('centrales', 0),
        'granos_t': a.get('granos_t', 0), 'sup_granos_ha': a.get('sup_granos_ha', 0),
        'pct_sembrado': r(a.get('sup_granos_ha', 0) / 100 / x['area_km2'] * 100 if x['area_km2'] else None),
    }
    tot = e.get('empleo') or 0
    for s in SECT:
        v['sec_' + s] = r(e['sectores'].get(s, 0) / tot * 100) if tot else None
    for cu in CULTIVOS:
        v['agro_' + cu] = a.get('prod_t', {}).get(cu, 0)
    for f in FUELS:
        v['mw_' + f] = r(c.get('mw_' + f, 0), 0)
    dep[i] = {k: val for k, val in v.items() if val is not None}

# ---------------- provincias ----------------
def ptab(fn):
    t = pd.read_csv(f'{C22}/{fn}'); t.columns = [c.strip() for c in t.columns]
    t = t[t.iloc[:, 0].str.match(r'^\d+\.\s')]
    t['prov'] = t.iloc[:, 0].str.extract(r'^(\d+)\.')[0].str.zfill(2)
    t = t[t.prov != '00'].set_index('prov')
    return t.apply(pd.to_numeric, errors='coerce')
ed = ptab('prov_educ_mayores.csv'); act = ptab('actividad_vs_provincia.csv')
net = ptab('hogares_vs_internet.csv'); pc = ptab('hogar_vs_compu.csv')
fu = pd.read_csv(f'{RAW}/datos-Fundar_complejidad_economica_subnacional/datos_socioeconomicos.csv')
def norm(s): return unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
PN = {norm(v): k for k, v in PROV_SHORT.items()}
PN.update({'CIUDAD AUTONOMA DE BUENOS AIRES': '02', 'CABA': '02', 'TIERRA DEL FUEGO': '94', 'TIERRA DEL FUEGO, ANTARTIDA E ISLAS DEL ATLANTICO SUR': '94'})
fu['prov'] = fu['provincia'].map(lambda s: PN.get(norm(s)))
print('Fundar sin mapear:', fu[fu.prov.isna()].provincia.unique())
FU = {'VAB per cápita (Argentina=100)': 'vab_pc', 'Exportaciones totales (M USD)': 'expo_musd',
      'Empresas privadas Cada 1000 habitantes': 'empresas_1000', 'Empresas privadas industriales Cada 1000 habitantes': 'empresas_ind_1000',
      'Graduados Universitarios cada 1000 habitantes': 'graduados_1000', 'Empleo privado registrado Cada 1000 habitantes': 'empleo_priv_1000_21'}
fuv = fu[fu.indicador.isin(FU)].pivot_table(index='prov', columns='indicador', values='valor', aggfunc='first').rename(columns=FU)

prov = {}
for p, g in D.groupby('prov'):
    ids = list(g['id']); dd = [dep[i] for i in ids]
    S = lambda k: sum(x.get(k, 0) or 0 for x in dd)
    pob = S('pob')
    v = {'pob': pob, 'pob2010': S('pob2010'), 'area': S('area'), 'viv': S('viv'), 'empleo': S('empleo'),
         'establecimientos': S('establecimientos'), 'escuelas': S('escuelas'), 'universidades': S('universidades'),
         'aeropuertos': S('aeropuertos'), 'potencia_mw': S('potencia_mw'), 'centrales': S('centrales'), 'granos_t': S('granos_t'),
         'sup_granos_ha': S('sup_granos_ha'), 'n_deptos': len(ids)}
    v['densidad'] = r(pob / v['area'], 1) if v['area'] else None
    v['var_pob'] = r((pob / v['pob2010'] - 1) * 100) if v['pob2010'] else None
    v['empleo_1000'] = r(v['empleo'] / pob * 1000) if pob else None
    v['escuelas_10k'] = r(v['escuelas'] / pob * 10000) if pob else None
    v['pers_viv'] = r(pob / v['viv'], 2) if v['viv'] else None
    v['pct_sembrado'] = r(v['sup_granos_ha'] / 100 / v['area'] * 100) if v['area'] else None
    v['elev_max'] = max((x.get('elev_max') or 0) for x in dd)
    for k in ['agro_' + c for c in CULTIVOS] + ['mw_' + f for f in FUELS]:
        v[k] = S(k)
    ep = json.load(open(f'{B}/empleo_prov.json')).get(p, {})
    tot = ep.get('empleo', 0)
    for s in SECT:
        v['sec_' + s] = r(ep.get('sectores', {}).get(s, 0) / tot * 100) if tot else None
    if p in ed.index:
        t = ed.loc[p]; base = t['__tot__'] - (t.get('Ignorado') or 0)
        v['pct_univ'] = r((t['Universitario completo'] + t['Posgrado incompleto'] + t['Posgrado completo']) / base * 100)
        v['pct_terc_univ'] = r((t['Terciario completo'] + t['Universitario completo'] + t['Posgrado incompleto'] + t['Posgrado completo']) / base * 100)
        v['pct_sin_secund'] = r((t['Sin instrucción'] + t['Primario incompleto'] + t['Primario completo'] + t['Secundario incompleto']) / base * 100)
    if p in act.index:
        t = act.loc[p]
        v['tasa_actividad_c'] = r((t['Ocupado'] + t['Desocupado']) / (t['Ocupado'] + t['Desocupado'] + t['Inactivo']) * 100)
        v['tasa_desoc_c'] = r(t['Desocupado'] / (t['Ocupado'] + t['Desocupado']) * 100)
    if p in net.index: v['pct_internet'] = r(net.loc[p, 'Sí'] / net.loc[p, '__tot__'] * 100)
    if p in pc.index: v['pct_compu'] = r(pc.loc[p, 'Sí'] / pc.loc[p, '__tot__'] * 100)
    if p in fuv.index:
        for k in FU.values():
            if k in fuv.columns and pd.notna(fuv.loc[p, k]): v[k] = r(fuv.loc[p, k], 1)
    # edad
    pyr = json.load(open(f'{B}/piramides.json'))['prov'].get(p)
    if pyr:
        a = np.array([m + w for m, w in pyr]); tot_ = a.sum()
        v['pct_0_14'] = r(a[:3].sum() / tot_ * 100); v['pct_65'] = r(a[13:].sum() / tot_ * 100)
        cum = np.cumsum(a); k = int(np.searchsorted(cum, tot_ / 2)); v['edad_mediana'] = k * 5 + 2
        v['masculinidad'] = r(sum(w for m, w in pyr) / sum(m for m, w in pyr) * 100)
    prov[p] = {k: val for k, val in v.items() if val is not None}
    prov[p]['nombre'] = PROV_SHORT[p]

# país
pais = {}
for k in ['pob','pob2010','area','viv','empleo','establecimientos','escuelas','universidades','aeropuertos','potencia_mw','centrales','granos_t','sup_granos_ha']:
    pais[k] = sum(x.get(k, 0) or 0 for x in prov.values())
pais['densidad'] = r(pais['pob'] / pais['area'], 1); pais['var_pob'] = r((pais['pob'] / pais['pob2010'] - 1) * 100)
pais['empleo_1000'] = r(pais['empleo'] / pais['pob'] * 1000); pais['escuelas_10k'] = r(pais['escuelas'] / pais['pob'] * 10000)
pais['pers_viv'] = r(pais['pob'] / pais['viv'], 2)
nat = emp['nacional']; tn = sum(nat.values())
for s in SECT: pais['sec_' + s] = r(nat.get(s, 0) / tn * 100)
for k in ['agro_' + c for c in CULTIVOS] + ['mw_' + f for f in FUELS]:
    pais[k] = sum(x.get(k, 0) or 0 for x in prov.values())
t = ed.sum(); base = t['__tot__'] - t['Ignorado']
pais['pct_univ'] = r((t['Universitario completo'] + t['Posgrado incompleto'] + t['Posgrado completo']) / base * 100)
pais['pct_terc_univ'] = r((t['Terciario completo'] + t['Universitario completo'] + t['Posgrado incompleto'] + t['Posgrado completo']) / base * 100)
pais['pct_sin_secund'] = r((t['Sin instrucción'] + t['Primario incompleto'] + t['Primario completo'] + t['Secundario incompleto']) / base * 100)
t = act.sum(); pais['tasa_actividad_c'] = r((t['Ocupado'] + t['Desocupado']) / (t['Ocupado'] + t['Desocupado'] + t['Inactivo']) * 100); pais['tasa_desoc_c'] = r(t['Desocupado'] / (t['Ocupado'] + t['Desocupado']) * 100)
pais['pct_internet'] = r(net['Sí'].sum() / net['__tot__'].sum() * 100); pais['pct_compu'] = r(pc['Sí'].sum() / pc['__tot__'].sum() * 100)
pyr = json.load(open(f'{B}/piramides.json'))['prov']['AR']; a = np.array([m + w for m, w in pyr]); tot_ = a.sum()
pais['pct_0_14'] = r(a[:3].sum() / tot_ * 100); pais['pct_65'] = r(a[13:].sum() / tot_ * 100); pais['masculinidad'] = r(sum(w for m, w in pyr) / sum(m for m, w in pyr) * 100)
pais['vab_pc'] = 100.0
pais['elev_max'] = max(x.get('elev_max', 0) for x in prov.values())
pais['pct_sembrado'] = r(pais['sup_granos_ha'] / 100 / pais['area'] * 100)

# ---------------- aglomerados EPH ----------------
pob_ = pd.read_csv('/home/claude/atlas/pipeline/pobreza_1s2026.csv', dtype={'prov': str})
tra = pd.read_csv('/home/claude/atlas/pipeline/trabajo_2t2026.csv')
ag = pob_.merge(tra, on='aglomerado', how='left')
L = pd.read_csv(f'{B}/localidades.csv', dtype={'code': str, 'depto': str, 'prov': str})
L['nn'] = L['name'].map(norm)
aglos = []
for _, x in ag.iterrows():
    c = L[(L.prov == x['prov'].zfill(2)) & (L.nn == norm(x['ciudad_ref']))].sort_values('pob', ascending=False)
    if len(c) == 0:
        c = L[(L.prov == x['prov'].zfill(2)) & L.nn.str.startswith(norm(x['ciudad_ref']))].sort_values('pob', ascending=False)
    if len(c) == 0: print('aglomerado sin ubicar', x['aglomerado']); continue
    c = c.iloc[0]
    aglos.append({'n': x['aglomerado'], 'prov': x['prov'].zfill(2), 'd': c['depto'], 'x': round(c['lon'], 4), 'y': round(c['lat'], 4),
                  'pobreza': x['pobreza_personas'], 'indigencia': x['indigencia_personas'], 'pobreza_hog': x['pobreza_hogares'],
                  'actividad': x['tasa_actividad'], 'empleo': x['tasa_empleo'], 'desocupacion': x['tasa_desocupacion'], 'subocupacion': x['tasa_subocupacion']})
json.dump(aglos, open(f'{W}/pt_aglomerados.json', 'w'), ensure_ascii=False)
pais['pobreza_eph'] = 32.3; pais['indigencia_eph'] = 7.5; pais['desocupacion_eph'] = 7.9

# ---------------- detalle (lazy) ----------------
det = {}
for i in dep:
    e = empd.get(i); a = agd.get(i)
    det[i] = {'esp': e['especializacion'] if e else [], 'act': e['top_actividades'] if e else [], 'ramas': e['top_ramas'] if e else [],
              'agro': a['prod_t'] if a else {}, 'sup': a['sup_ha'] if a else {}}
ep = json.load(open(f'{B}/empleo_prov.json'))
pdet = {p: {'ramas': ep.get(p, {}).get('top_ramas', [])} for p in prov}
json.dump({'deptos': det, 'provincias': pdet, 'piramides': json.load(open(f'{B}/piramides.json'))}, open(f'{W}/detalle.json', 'w'), ensure_ascii=False, separators=(',', ':'))

meta_d = {i: {'n': D.set_index('id').loc[i, 'nombre'], 'p': D.set_index('id').loc[i, 'prov']} for i in dep}
json.dump({'deptos': dep, 'provincias': prov, 'pais': pais, 'nombres': meta_d,
           'sectores': {k: v for k, v in emp['letras'].items() if k in SECT}, 'campania': agro['campania']},
          open(f'{W}/datos.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------- geometrías ----------------
g = D[['id', 'nombre', 'prov', 'geometry']].copy()
g = g[~g.id.isin(['94028'])]  # Antártida (sector) fuera del mapa principal
g.to_file(f'{B}/d.geojson', driver='GeoJSON')
ms = '/home/claude/atlas/node_modules/.bin/mapshaper'
subprocess.run([ms, f'{B}/d.geojson', 'name=deptos', '-simplify', '8%', 'keep-shapes', '-clean',
                '-o', f'{B}/deptos.topo.json', 'format=topojson', 'quantization=1e5'], check=True)
subprocess.run([ms, f'{B}/d.geojson', '-dissolve', 'prov', '-simplify', '6%', 'keep-shapes', '-o', f'{W}/provincias.geo.json', 'format=geojson', 'precision=0.001'], check=True)
subprocess.run([ms, f'{B}/d.geojson', 'name=deptos', '-simplify', '8%', 'keep-shapes', '-clean', '-o', f'{W}/deptos.geo.json', 'format=geojson', 'precision=0.001'], check=True)
for f in ['rios', 'lagos', 'glaciares', 'ferrocarriles', 'rutas', 'areas_urbanas', 'vecinos']:
    subprocess.run([ms, f'{B}/{f}.geojson', '-o', f'{W}/{f}.geo.json', 'format=geojson', 'precision=0.001'], check=True)
for f in os.listdir(B):
    if f.startswith('pt_'): shutil.copy(f'{B}/{f}', f'{W}/{f}')
shutil.copy(f'{B}/relieve.png', f'{W}/relieve.png'); shutil.copy(f'{B}/relieve_meta.json', f'{W}/relieve_meta.json')
print('ok', len(dep), 'deptos', len(prov), 'prov', len(aglos), 'aglomerados')
print({k: pais[k] for k in ['pob', 'pct_univ', 'tasa_desoc_c', 'pct_internet', 'empleo', 'granos_t', 'potencia_mw', 'escuelas']})
