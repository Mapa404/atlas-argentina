"""Paso 5: estimaciones agrícolas (MAGyP) por departamento, última campaña disponible."""
import json, pandas as pd
RAW = '/home/claude/raw'; OUT = '/home/claude/atlas/build'
d = pd.read_csv(f'{RAW}/Nux-PxT_analisis-exploratorio-estimaciones-agricolas/data/estimaciones-agricolas-2026-03.csv', dtype={'departamento_id': str, 'provincia_id': str}, low_memory=False)
def remap(dep):
    return {'94008':'94007','94011':'94007','94015':'94014','06218':'06217','06466':'06217'}.get(dep, dep)
d['id'] = d['departamento_id'].str.zfill(5).map(remap)
camp = sorted(d.campania.unique())[-1]
x = d[d.campania == camp].copy()
# cultivos principales (evitar doble conteo: totales vs sub-tipos)
CULT = {'soja total':'Soja','maíz':'Maíz','trigo total':'Trigo','girasol':'Girasol','sorgo':'Sorgo',
        'cebada total':'Cebada','colza':'Colza','centeno':'Centeno','lino':'Lino','garbanzo':'Garbanzo','lenteja':'Lenteja','arveja':'Arveja','algodón':'Algodón','maní':'Maní','arroz':'Arroz',
        'poroto total':'Poroto','avena':'Avena','caña de azúcar':'Caña de azúcar','yerba mate':'Yerba mate',
        'papa total':'Papa','vid':'Vid','limón':'Limón','naranja':'Naranja','té':'Té','tabaco':'Tabaco','olivo':'Olivo'}
print('cultivos en la campaña:', sorted(x.cultivo.unique()))
x = x[x.cultivo.isin(CULT)]
x['c'] = x['cultivo'].map(CULT)
for col in ['superficie_sembrada_ha','produccion_tm']:
    x[col] = pd.to_numeric(x[col], errors='coerce').fillna(0)
GRANOS = ['Soja','Maíz','Trigo','Girasol','Sorgo','Cebada','Maní','Arroz','Avena','Poroto','Algodón','Colza','Centeno','Lino','Garbanzo','Lenteja','Arveja']
out = {}
for dep, g in x.groupby('id'):
    p = g.groupby('c').produccion_tm.sum(); s = g.groupby('c').superficie_sembrada_ha.sum()
    out[dep] = {'campania': camp, 'prod_t': {k: int(v) for k, v in p.items() if v > 0},
                'sup_ha': {k: int(v) for k, v in s.items() if v > 0},
                'granos_t': int(p.reindex(GRANOS).fillna(0).sum()), 'sup_granos_ha': int(s.reindex(GRANOS).fillna(0).sum())}
json.dump({'campania': camp, 'deptos': out}, open(f'{OUT}/agro.json', 'w'), ensure_ascii=False)
tot = x.groupby('c').produccion_tm.sum().sort_values(ascending=False)
print(camp, len(out), 'deptos'); print((tot/1e6).round(2).to_string())
