"""Paso 4: relieve (ETOPO 10'), estadísticos por departamento e imagen de sombreado en Web Mercator."""
import json, numpy as np, h5py, geopandas as gpd
from PIL import Image
from rasterio import features
from affine import Affine
OUT = '/home/claude/atlas/build'
f = h5py.File('/home/claude/raw/dem/topo.nc', 'r')
keys = list(f.keys()); print(keys)
lat = f['latitude'][:]; lon = f['longitude'][:]; z = f['topography'][:].astype(float)
print(z.shape, lat[:3], lon[:3])
W, S, E, N = -76, -57, -52, -20
yi = np.where((lat >= S) & (lat <= N))[0]; xi = np.where((lon >= W) & (lon <= E))[0]
Z = z[yi[0]:yi[-1]+1, xi[0]:xi[-1]+1]; la = lat[yi]; lo = lon[xi]
if la[0] < la[-1]: Z = Z[::-1]; la = la[::-1]   # norte arriba
res = abs(lo[1]-lo[0])
tr = Affine(res, 0, lo[0]-res/2, 0, -res, la[0]+res/2)

D = gpd.read_file(f'{OUT}/deptos_base.gpkg')
stats = {}
for _, r in D.iterrows():
    m = features.geometry_mask([r.geometry], Z.shape, tr, invert=True, all_touched=True)
    v = Z[m]
    if v.size == 0: continue
    v = np.clip(v, 0, None)
    stats[r['id']] = {'elev_media': round(float(v.mean())), 'elev_max': round(float(v.max())), 'elev_min': round(float(v.min()))}
json.dump(stats, open(f'{OUT}/relieve.json', 'w'))

# imagen hipsométrica + sombreado, reproyectada a Web Mercator
def merc(latd): return np.log(np.tan(np.pi/4 + np.radians(latd)/2))
Wb, Sb, Eb, Nb = -76, -57, -52, -20
Wpx = 1400
Hpx = int(Wpx * (merc(Nb) - merc(Sb)) / np.radians(Eb - Wb))
ys = np.linspace(merc(Nb), merc(Sb), Hpx); latp = np.degrees(2*np.arctan(np.exp(ys)) - np.pi/2)
lonp = np.linspace(Wb, Eb, Wpx)
from scipy.ndimage import map_coordinates, zoom
ri = (la[0] - latp) / res; ci = (lonp - lo[0]) / res
RR, CC = np.meshgrid(ri, ci, indexing='ij')
ZZ = map_coordinates(Z, [RR, CC], order=1)
# sombreado
dy, dx = np.gradient(ZZ, 1, 1)
k = 0.004
az, alt = np.radians(315), np.radians(45)
slope = np.arctan(k * np.hypot(dx, dy)); aspect = np.arctan2(-dx, dy)
hs = np.sin(alt)*np.cos(slope) + np.cos(alt)*np.sin(slope)*np.cos(az - aspect)
hs = np.clip(hs, 0, 1)
# rampa hipsométrica apagada (estilo atlas)
stops = [(-6000, (205, 220, 226)), (-200, (222, 232, 235)), (0, (238, 240, 228)), (200, (228, 232, 208)), (600, (226, 222, 196)),
         (1500, (214, 198, 168)), (3000, (196, 174, 146)), (4500, (188, 176, 164)), (6500, (240, 238, 236))]
zs = np.array([s[0] for s in stops]); cs = np.array([s[1] for s in stops], float)
rgb = np.stack([np.interp(ZZ, zs, cs[:, i]) for i in range(3)], -1)
land = ZZ > 0
shade = 0.55 + 0.6*hs
rgb[land] = rgb[land] * shade[land, None]
rgb = np.clip(rgb, 0, 255).astype(np.uint8)
alpha = np.where(land, 255, 0).astype(np.uint8)
Image.fromarray(np.dstack([rgb, alpha]), 'RGBA').save(f'{OUT}/relieve.png', optimize=True)
json.dump({'bounds': [Wb, Sb, Eb, Nb]}, open(f'{OUT}/relieve_meta.json', 'w'))
print('relieve.png', Wpx, Hpx, 'stats', len(stats))
