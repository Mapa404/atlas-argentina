"""Paso 2: empleo privado registrado por departamento y actividad (CEP XXI vía Fundar)."""
import json, numpy as np, pandas as pd
RAW = '/home/claude/raw'; OUT = '/home/claude/atlas/build'

e = pd.read_csv(f'{RAW}/datos-Fundar_complejidad_economica_empleo/datasets/Datos_por_departamento_y_actividad.csv')
e['id'] = e['in_departamentos'].astype(int).astype(str).str.zfill(5)
# alinear códigos a la cartografía
def remap(dep):
    if dep.startswith('02'):
        n = int(dep[2:]); return '02%03d' % (n//7 if n % 7 == 0 and n >= 7 else n)
    return {'94008':'94007','94011':'94007','94015':'94014','06218':'06217','06466':'06217'}.get(dep, dep)
e['id'] = e['id'].map(remap)
c = pd.read_excel(f'{RAW}/datos-Fundar_complejidad_economica_empleo/datasets/clae_agg.xlsx')
letras = c.drop_duplicates('letra').set_index('letra')['letra_desc'].to_dict()
clae6 = c.set_index('clae6')['clae6_desc'].to_dict()
clae2 = c.drop_duplicates('clae2').set_index('clae2')['clae2_desc'].to_dict()

# nombres cortos para sectores
CORTO = {'A':'Agro y pesca','B':'Minería y petróleo','C':'Industria','D':'Electricidad y gas','E':'Agua y residuos',
 'F':'Construcción','G':'Comercio','H':'Transporte','I':'Hotelería y gastronomía','J':'Información y comunicaciones',
 'K':'Finanzas','L':'Inmobiliarias','M':'Servicios profesionales','N':'Servicios de apoyo','O':'Administración pública',
 'P':'Enseñanza','Q':'Salud','R':'Cultura y recreación','S':'Otros servicios','T':'Hogares','U':'Organismos internacionales'}

nat_l = e.groupby('letra').Empleo.sum(); nat_tot = nat_l.sum()
nat_share = nat_l / nat_tot
out = {}
for dep, d in e.groupby('id'):
    tot = d.Empleo.sum(); est = d.Establecimientos.sum()
    bl = d.groupby('letra').Empleo.sum()
    share = (bl / tot)
    lq = (share / nat_share.reindex(share.index))
    # especializaciones: LQ alto y peso relevante
    spec = [(k, float(lq[k]), float(share[k])) for k in lq.index if share[k] >= 0.03 and lq[k] >= 1.4]
    spec.sort(key=lambda x: -x[1]*x[2])
    top6 = d.groupby('clae6').Empleo.sum().sort_values(ascending=False).head(6)
    top2 = d.groupby('clae2').Empleo.sum().sort_values(ascending=False).head(5)
    out[dep] = {
        'empleo': int(tot), 'establecimientos': int(est),
        'sectores': {k: int(v) for k, v in bl.items()},
        'especializacion': [{'letra': k, 'sector': CORTO.get(k, letras.get(k)), 'cl': round(l, 2), 'peso': round(s*100, 1)} for k, l, s in spec[:4]],
        'top_actividades': [{'clae6': int(k), 'desc': clae6.get(k, str(k)), 'empleo': int(v)} for k, v in top6.items()],
        'top_ramas': [{'clae2': int(k), 'desc': clae2.get(k, str(k)), 'empleo': int(v)} for k, v in top2.items()],
    }
json.dump({'deptos': out, 'letras': {k: {'corto': CORTO.get(k), 'desc': letras.get(k)} for k in letras},
           'nacional': {k: int(v) for k, v in nat_l.items()}}, open(f'{OUT}/empleo.json', 'w'), ensure_ascii=False)
print('deptos con empleo', len(out), 'total', nat_tot)
# por provincia
e['prov'] = e['id'].str[:2]
prov = {}
for p, d in e.groupby('prov'):
    bl = d.groupby('letra').Empleo.sum()
    top2 = d.groupby('clae2').Empleo.sum().sort_values(ascending=False).head(6)
    prov[p] = {'empleo': int(bl.sum()), 'establecimientos': int(d.Establecimientos.sum()), 'sectores': {k: int(v) for k, v in bl.items()},
               'top_ramas': [{'clae2': int(k), 'desc': clae2.get(k, str(k)), 'empleo': int(v)} for k, v in top2.items()]}
json.dump(prov, open(f'{OUT}/empleo_prov.json', 'w'), ensure_ascii=False)
