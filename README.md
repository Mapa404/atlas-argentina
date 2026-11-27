# Atlas de datos de Argentina

Un mapa de consulta con datos públicos de Argentina por provincia, departamento y localidad: población, vivienda, educación, trabajo, empleo por sector, agro, energía, infraestructura y territorio. Cada dato lleva su fuente.

## Qué tiene

- **Mapa** con 75 indicadores, a nivel provincia o departamento (527 departamentos, partidos y comunas), y capas de puntos y líneas: localidades del Censo 2022, pobreza por aglomerado (EPH), escuelas, universidades, centrales eléctricas, aeropuertos, puertos, rutas, ferrocarriles, parques nacionales, ríos, glaciares y relieve.
- **Fichas** del país, de cada provincia, departamento, localidad y punto: pirámide de población, comparación con el país, posición en el ranking, empleo por sector, especialización productiva, cosecha, potencia eléctrica y localidades principales.
- **Explorador**: tabla con cualquier combinación de indicadores, gráfico de dispersión con correlación y descarga en CSV.
- **Fuentes**: cada fuente con su año, qué se usa de ella y las advertencias para leer los datos.

## Estructura

- `web/` — el sitio (Vite + MapLibre GL, sin servidor). `web/public/data/` tiene los datos ya procesados.
- `pipeline/` — los scripts de Python que bajan, cruzan y exportan los datos (`p1_base.py` … `p6_export.py`), y las tablas cargadas a mano desde informes del INDEC y de Wikipedia.

## Desarrollo

```bash
cd web
npm install
npm run dev
```

## Fuentes principales

INDEC (Censo 2022, Censo 2010, EPH), CEP XXI – Ministerio de Economía, Ministerio de Agricultura (estimaciones agrícolas), Ministerio de Educación, Fundar, NOAA ETOPO, Natural Earth, WRI Global Power Plant Database, OurAirports, BAHRA, Administración de Parques Nacionales. El detalle, con enlaces, está en la sección «Fuentes» del sitio.
