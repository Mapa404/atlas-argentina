"""Paso 1: geometría de departamentos/provincias + Censo 2022 + Censo 2010 + indicadores."""
import json, re
import numpy as np, pandas as pd, geopandas as gpd

RAW = '/home/claude/raw'
OUT = '/home/claude/atlas/build'
C22 = f'{RAW}/Fabriciositto_censo_argentina_2022/datasets'

PROV = {
 '02':'Ciudad Autónoma de Buenos Aires','06':'Buenos Aires','10':'Catamarca','14':'Córdoba','18':'Corrientes',
 '22':'Chaco','26':'Chubut','30':'Entre Ríos','34':'Formosa','38':'Jujuy','42':'La Pampa','46':'La Rioja',
 '50':'Mendoza','54':'Misiones','58':'Neuquén','62':'Río Negro','66':'Salta','70':'San Juan','74':'San Luis',
 '78':'Santa Cruz','82':'Santa Fe','86':'Santiago del Estero','90':'Tucumán','94':'Tierra del Fuego, Antártida e Islas del Atlántico Sur'}
PROV_SHORT = {**PROV, '02':'CABA', '94':'Tierra del Fuego'}

def num(s):
    return pd.to_numeric(s, errors='coerce')

# ---------- geometría ----------
g = gpd.read_file(f'{RAW}/datos-Fundar_complejidad_economica_empleo/maps/pxdptodatosok.shp')
g = g.rename(columns={'link':'id','departamen':'nombre','codpcia':'prov'})
for c in ['mujeres','varones','personas','hogares','viv_part','viv_part_h']:
    g[c] = num(g[c])
g = g.to_crs(4326)
g['area_km2'] = g.to_crs('+proj=laea +lat_0=-38 +lon_0=-64').area / 1e6
c2010 = g[['id','personas','hogares','viv_part']].rename(columns={'personas':'pob2010','hogares':'hog2010','viv_part':'viv2010'})

# ---------- Censo 2022 por localidad (edad simple x sexo) ----------
def read_loc(fn):
    d = pd.read_csv(f'{C22}/{fn}')
    d.columns = [c.strip() for c in d.columns]
    d = d[d['Localidad'].str.match(r'^\d{7,8}\.')].copy()
    d['code'] = d['Localidad'].str.extract(r'^(\d+)\.')[0].str.zfill(8)
    d['name'] = d['Localidad'].str.replace(r'^\d+\.\s*', '', regex=True)
    ages = [str(i) for i in range(0, 111)]
    A = d[ages].apply(num).fillna(0).to_numpy()
    return d[['code','name']].reset_index(drop=True), A

lm, Am = read_loc('mujeres_localidad_vs_edad.csv')
lv, Av = read_loc('varones_localidad_vs_edad.csv')
loc = pd.merge(lm.assign(i=range(len(lm))), lv.assign(j=range(len(lv))), on='code', how='outer', suffixes=('','_v'))
loc['name'] = loc['name'].fillna(loc['name_v'])
Z = np.zeros(111)
age_m = np.array([Am[int(i)] if pd.notna(i) else Z for i in loc['i']])
age_v = np.array([Av[int(j)] if pd.notna(j) else Z for j in loc['j']])
loc['mujeres'] = age_m.sum(1); loc['varones'] = age_v.sum(1)
loc['pob'] = loc['mujeres'] + loc['varones']
def remap(dep):
    # CABA 2022 usa 02007, 02014 ... (comuna*7); la cartografía usa 02001..02015
    if dep.startswith('02'):
        n = int(dep[2:]); return '02%03d' % (n//7 if n % 7 == 0 and n >= 7 else n)
    return {'94008':'94007','94011':'94007','94015':'94014','06218':'06217','06466':'06217'}.get(dep, dep)
loc['depto'] = loc['code'].str[:5].map(remap)
_geo_ids = set(g['id'])
print('codigos 2022 sin geometria:', loc[~loc.depto.isin(_geo_ids)].groupby('depto').agg(n=('name','first'), p=('pob','sum')).to_string())
print('pob total 2022 (viv. particulares):', int(loc.pob.sum()), 'localidades', len(loc))

# viviendas 2022 por localidad (archivo loc_vs_dpto = viviendas)
vv = pd.read_csv(f'{C22}/loc_vs_dpto.csv')
vv.columns = [c.strip() for c in vv.columns]
vv = vv[vv['Localidad'].str.match(r'^\d{7,8}\.')]
vv['code'] = vv['Localidad'].str.extract(r'^(\d+)\.')[0].str.zfill(8)
vv['viv'] = num(vv['__tot__'])
loc = loc.merge(vv[['code','viv']], on='code', how='left')

# agregados por departamento
ages_all = age_m + age_v
def age_stats(A):
    tot = A.sum()
    if tot <= 0: return {}
    cum = np.cumsum(A); med = int(np.searchsorted(cum, tot/2))
    p0_14 = A[:15].sum()/tot; p15_64 = A[15:65].sum()/tot; p65 = A[65:].sum()/tot
    return {'edad_mediana': med, 'pct_0_14': p0_14*100, 'pct_65': p65*100,
            'dependencia': (p0_14+p65)/p15_64*100 if p15_64 else None}

rows = []
for dep, idx in loc.groupby('depto').groups.items():
    idx = list(idx)
    A = ages_all[idx].sum(0); M = age_m[idx].sum(); V = age_v[idx].sum()
    r = {'id': dep, 'pob2022': A.sum(), 'mujeres2022': M, 'varones2022': V,
         'masculinidad': V/M*100 if M else None, 'viv2022': loc.loc[idx,'viv'].sum(),
         'n_localidades': int((loc.loc[idx,'name']!='ZONA RURAL').sum()),
         'pob_rural_dispersa': loc.loc[idx][loc.loc[idx,'name']=='ZONA RURAL'].pob.sum()}
    r.update(age_stats(A)); rows.append(r)
d22 = pd.DataFrame(rows)
# pirámide por provincia y país (grupos quinquenales)
def pyr(Am_, Av_):
    out = []
    for a in range(0, 100, 5):
        out.append([int(Am_[a:a+5].sum()), int(Av_[a:a+5].sum())])
    out.append([int(Am_[100:].sum()), int(Av_[100:].sum())])
    return out
loc['prov'] = loc['code'].str[:2]
pyramids = {'AR': pyr(age_m.sum(0), age_v.sum(0))}
for p, idx in loc.groupby('prov').groups.items():
    pyramids[p] = pyr(age_m[list(idx)].sum(0), age_v[list(idx)].sum(0))
dep_pyr = {}
for dep, idx in loc.groupby('depto').groups.items():
    dep_pyr[dep] = pyr(age_m[list(idx)].sum(0), age_v[list(idx)].sum(0))

# ---------- indicadores datosgobar (censo 2010, por depto) ----------
ind = pd.read_excel(f'{RAW}/datosgobar_densidad-poblacion/dataset/indicadores_departamento.xlsx')
ind['id'] = ind['departamento_id'].astype(int).astype(str).str.zfill(5)
ind = ind[['id','jovenes_proporcion','jovenes_asistencia_escolar','personas_por_cuarto','propietarios_vivienda_proporcion']]

D = g[['id','nombre','prov','area_km2','geometry']].merge(d22, on='id', how='left').merge(c2010, on='id', how='left').merge(ind, on='id', how='left')
missing = D[D.pob2022.isna()][['id','nombre','prov']]
print('deptos sin censo 2022:', len(missing)); print(missing.to_string())
D['densidad'] = D['pob2022'] / D['area_km2']
D['var_pob'] = (D['pob2022']/D['pob2010'] - 1) * 100
D['personas_por_vivienda'] = D['pob2022'] / D['viv2022']
D['provincia'] = D['prov'].map(PROV_SHORT)

# localidades con coordenadas (BAHRA)
bh = pd.read_csv(f'{RAW}/HackatONG-ProgramAR_Localidades-Argentinas/resources/bahra-base-final-21-05-2014.csv', dtype=str)
bh['code'] = bh['cod_prov'].str.zfill(2) + bh['cod_depto'].str.zfill(3) + bh['cod_loc'].str.zfill(3)
bh['lat'] = num(bh['lat_gd']); bh['lon'] = num(bh['long_gd'])
lc = bh[bh['tipo_bahra'].str.strip().isin(['LC','LS','E','C'])]
# preferir la entidad de tipo LC/LS (localidad), luego promedio
pref = lc.sort_values('tipo_bahra').groupby('code').agg(lat=('lat','first'), lon=('lon','first'), bname=('nombre_bahra','first')).reset_index()
L0 = loc[loc['name']!='ZONA RURAL'].copy()
# CABA como una sola ciudad
caba = L0[L0.prov=='02']
caba_row = {'code':'02000010','name':'Ciudad Autónoma de Buenos Aires','depto':'02001','prov':'02',
            'pob':caba.pob.sum(),'mujeres':caba.mujeres.sum(),'varones':caba.varones.sum(),'viv':caba.viv.sum()}
L0 = pd.concat([L0[L0.prov!='02'], pd.DataFrame([caba_row])], ignore_index=True)
L0['code_b'] = [c if c.startswith('02') else remap(c[:5]) + c[5:] for c in L0['code']]
L = L0.merge(pref.rename(columns={'code':'code_b'}), on='code_b', how='left')
# fallback por nombre dentro de la provincia
import unicodedata
def norm(s): return unicodedata.normalize('NFKD', str(s)).encode('ascii','ignore').decode().upper().strip()
bh['nn'] = bh['nombre_bahra'].map(norm); bh['pp'] = bh['cod_prov'].str.zfill(2)
byname = bh.dropna(subset=['lat']).drop_duplicates(['pp','nn']).set_index(['pp','nn'])[['lat','lon']]
for i in L.index[L.lat.isna()]:
    k = (L.at[i,'prov'], norm(L.at[i,'name']).replace(' (EXPANSION)',''))
    if k in byname.index:
        L.at[i,'lat'], L.at[i,'lon'] = byname.loc[k,'lat'], byname.loc[k,'lon']
# CABA: comunas -> una sola fila "Ciudad de Buenos Aires" se mantiene por comuna; fallback coords por depto centroid
cent = D.set_index('id').geometry.representative_point()
nolat = L.lat.isna()
print('localidades sin coord BAHRA:', int(nolat.sum()), 'de', len(L), 'pob sin coord:', int(L[nolat].pob.sum()))
print(L[nolat].sort_values('pob',ascending=False).head(25)[['code','name','pob']].to_string())
L = L[~nolat]

D.to_file(f'{OUT}/deptos_base.gpkg', driver='GPKG')
L[['code','name','depto','prov','pob','mujeres','varones','viv','lat','lon']].to_csv(f'{OUT}/localidades.csv', index=False)
json.dump({'prov': pyramids, 'depto': dep_pyr}, open(f'{OUT}/piramides.json','w'))
print(D[['pob2022','pob2010']].sum())
