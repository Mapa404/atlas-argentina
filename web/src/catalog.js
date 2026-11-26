// Catálogo de indicadores: qué se puede mapear, en qué nivel, con qué unidad y de qué fuente sale.
// niveles: d = departamento, p = provincia

export const FUENTES = {
  censo22: { nombre: 'INDEC — Censo Nacional de Población, Hogares y Viviendas 2022', detalle: 'Población en viviendas particulares, por localidad censal, edad simple y sexo; viviendas; nivel educativo, condición de actividad y acceso a internet/computadora por provincia. Tabulados REDATAM, vía el repositorio público Fabriciositto/censo_argentina_2022.', url: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-2-41-165', anio: '2022' },
  censo10: { nombre: 'INDEC — Censo 2010 y cartografía departamental', detalle: 'Población 2010 y límites de departamentos/partidos/comunas (códigos INDEC). Vía Fundar, repositorio complejidad_economica_empleo.', url: 'https://www.indec.gob.ar/indec/web/Institucional-Indec-Codgeo', anio: '2010' },
  datosgob10: { nombre: 'Datos Argentina — Indicadores por departamento (Censo 2010)', detalle: 'Hacinamiento (personas por cuarto), propiedad de la vivienda y asistencia escolar de jóvenes. Repositorio datosgobar/densidad-poblacion.', url: 'https://github.com/datosgobar/densidad-poblacion', anio: '2010' },
  cep: { nombre: 'CEP XXI (Ministerio de Economía) — Empleo privado registrado por departamento y actividad', detalle: 'Puestos asalariados registrados y establecimientos por departamento y clase de actividad (CLAE 6 dígitos). Publicado en datos.gob.ar; procesado por Fundar (Luvini, 2024).', url: 'https://datos.gob.ar/dataset/produccion-distribucion-geografica-establecimientos-productivos', anio: 'c. 2022' },
  fundar: { nombre: 'Fundar — Radiografía de la complejidad económica subnacional', detalle: 'VAB per cápita relativo, exportaciones, empresas y graduados universitarios por provincia, a partir de INDEC, Ministerio de Economía, OEDE y Ministerio de Educación.', url: 'https://github.com/datos-Fundar/complejidad_economica_subnacional', anio: '2017–2021' },
  magyp: { nombre: 'Ministerio de Agricultura (MAGyP) — Estimaciones agrícolas', detalle: 'Superficie sembrada y producción por cultivo y departamento. Copia pública del dataset oficial (Nux-PxT/analisis-exploratorio-estimaciones-agricolas, versión 2026-03).', url: 'https://datosestimaciones.magyp.gob.ar/', anio: 'Campaña 2024/25' },
  eph_pob: { nombre: 'INDEC — EPH, Incidencia de la pobreza y la indigencia en 31 aglomerados urbanos', detalle: 'Porcentaje de personas y hogares bajo la línea de pobreza e indigencia, por aglomerado. Sólo representa áreas urbanas relevadas.', url: 'https://www.indec.gob.ar/uploads/informesdeprensa/eph_pobreza_09_2670733F4C4D.pdf', anio: '1er semestre 2026' },
  eph_trab: { nombre: 'INDEC — EPH, Mercado de trabajo. Tasas e indicadores socioeconómicos', detalle: 'Tasas de actividad, empleo, desocupación y subocupación por aglomerado.', url: 'https://www.indec.gob.ar/uploads/informesdeprensa/mercado_trabajo_eph_2trim26433FCBC5A8.pdf', anio: '2do trimestre 2026' },
  escuelas: { nombre: 'Ministerio de Educación — Mapa educativo nacional (WFS)', detalle: 'Escuelas primarias y secundarias geolocalizadas, con sector de gestión. Extracción publicada por avdata99/escuelas-argentinas.', url: 'https://github.com/avdata99/escuelas-argentinas', anio: 'c. 2016' },
  univ: { nombre: 'Wikipedia — Lista de universidades de Argentina', detalle: 'Universidades nacionales, provinciales y privadas con su sede principal; ubicadas sobre la localidad censal correspondiente.', url: 'https://en.wikipedia.org/wiki/List_of_universities_in_Argentina', anio: '2026' },
  parques: { nombre: 'Administración de Parques Nacionales (vía Wikipedia)', detalle: 'Parques nacionales con superficie, año de creación y ubicación aproximada.', url: 'https://en.wikipedia.org/wiki/List_of_national_parks_of_Argentina', anio: '2026' },
  aeropuertos: { nombre: 'OurAirports', detalle: 'Aeródromos y aeropuertos con tipo, código IATA, elevación y servicio regular. Base abierta mantenida por la comunidad.', url: 'https://ourairports.com/countries/AR/', anio: '2026' },
  centrales: { nombre: 'World Resources Institute — Global Power Plant Database v1.3', detalle: 'Centrales eléctricas con potencia instalada y fuente. No incluye la mayoría de los parques eólicos y solares construidos después de 2018.', url: 'https://datasets.wri.org/dataset/globalpowerplantdatabase', anio: '2021' },
  etopo: { nombre: 'NOAA — ETOPO (grilla de 10 minutos de arco, vía Fatiando)', detalle: 'Relieve y elevación. Resolución aproximada de 18 km: suaviza las cumbres, por eso las alturas máximas quedan por debajo de las reales.', url: 'https://github.com/fatiando-data/earth-topography-10arcmin', anio: '2022' },
  ne: { nombre: 'Natural Earth 1:10m', detalle: 'Ríos, lagos, glaciares, ferrocarriles, rutas principales, puertos, áreas urbanas y países vecinos.', url: 'https://www.naturalearthdata.com/', anio: 'v5' },
  bahra: { nombre: 'BAHRA — Base de Asentamientos Humanos de la República Argentina', detalle: 'Coordenadas de localidades, unidas por código a la población del Censo 2022.', url: 'https://github.com/HackatONG-ProgramAR/Localidades-Argentinas', anio: '2014' },
};

const T = {
  pob: 'Población', viv: 'Vivienda y hogares', edu: 'Educación', trab: 'Trabajo y economía',
  sect: 'Empleo por sector', agro: 'Agro', energia: 'Energía', infra: 'Infraestructura', terr: 'Territorio',
};
export const TEMAS = T;

// fmt: 'n' entero, 'd1' 1 decimal, 'pct' porcentaje, 'd2' 2 decimales
export const IND = [
  { k: 'pob', l: 'Población', u: 'personas', t: T.pob, lv: 'dp', f: 'n', s: 'censo22', scale: 'log', d: 'Personas en viviendas particulares relevadas por el Censo 2022.' },
  { k: 'densidad', l: 'Densidad de población', u: 'hab./km²', t: T.pob, lv: 'dp', f: 'd1', s: 'censo22', scale: 'log', d: 'Población 2022 dividida por la superficie del departamento.' },
  { k: 'var_pob', l: 'Crecimiento de la población 2010–2022', u: '%', t: T.pob, lv: 'dp', f: 'd1', s: 'censo22', div: 0, d: 'Variación porcentual entre la población 2010 y la de 2022.' },
  { k: 'edad_mediana', l: 'Edad mediana', u: 'años', t: T.pob, lv: 'dp', f: 'n', s: 'censo22', d: 'Edad que divide a la población en dos mitades iguales.' },
  { k: 'pct_0_14', l: 'Niñas y niños de 0 a 14 años', u: '% de la población', t: T.pob, lv: 'dp', f: 'd1', s: 'censo22' },
  { k: 'pct_65', l: 'Personas de 65 años o más', u: '% de la población', t: T.pob, lv: 'dp', f: 'd1', s: 'censo22' },
  { k: 'dependencia', l: 'Índice de dependencia', u: 'por cada 100 de 15–64', t: T.pob, lv: 'd', f: 'd1', s: 'censo22', d: 'Personas de 0–14 y 65+ por cada 100 personas de 15 a 64 años.' },
  { k: 'masculinidad', l: 'Índice de masculinidad', u: 'varones cada 100 mujeres', t: T.pob, lv: 'dp', f: 'd1', s: 'censo22', div: 100 },
  { k: 'pct_rural_disp', l: 'Población rural dispersa', u: '% de la población', t: T.pob, lv: 'd', f: 'd1', s: 'censo22', d: 'Personas que viven en zona rural fuera de toda localidad.' },

  { k: 'n_localidades', l: 'Localidades censales', u: 'localidades', t: T.pob, lv: 'd', f: 'n', s: 'censo22', d: 'Cantidad de localidades (sin contar la zona rural) que el censo registra en el departamento.' },
  { k: 'viv', l: 'Viviendas', u: 'viviendas', t: T.viv, lv: 'dp', f: 'n', s: 'censo22', scale: 'log' },
  { k: 'pers_viv', l: 'Personas por vivienda', u: 'personas', t: T.viv, lv: 'dp', f: 'd2', s: 'censo22', d: 'Población en viviendas particulares sobre el total de viviendas (incluye viviendas desocupadas).' },
  { k: 'pers_cuarto10', l: 'Personas por cuarto (2010)', u: 'personas', t: T.viv, lv: 'd', f: 'd2', s: 'datosgob10', d: 'Indicador de hacinamiento del Censo 2010.' },
  { k: 'propietarios10', l: 'Hogares propietarios (2010)', u: '% de los hogares', t: T.viv, lv: 'd', f: 'd1', s: 'datosgob10' },
  { k: 'pct_internet', l: 'Hogares con internet', u: '% de los hogares', t: T.viv, lv: 'p', f: 'd1', s: 'censo22' },
  { k: 'pct_compu', l: 'Hogares con computadora', u: '% de los hogares', t: T.viv, lv: 'p', f: 'd1', s: 'censo22' },

  { k: 'pct_univ', l: 'Universitario completo o más', u: '% de quienes ya no asisten', t: T.edu, lv: 'p', f: 'd1', s: 'censo22', d: 'Máximo nivel alcanzado: universitario completo o posgrado, entre la población que asistió y ya no asiste a la escuela.' },
  { k: 'pct_terc_univ', l: 'Terciario o universitario completo', u: '% de quienes ya no asisten', t: T.edu, lv: 'p', f: 'd1', s: 'censo22' },
  { k: 'pct_sin_secund', l: 'Sin secundario completo', u: '% de quienes ya no asisten', t: T.edu, lv: 'p', f: 'd1', s: 'censo22' },
  { k: 'asist_jov10', l: 'Asistencia escolar de jóvenes (2010)', u: '%', t: T.edu, lv: 'd', f: 'd1', s: 'datosgob10' },
  { k: 'escuelas', l: 'Escuelas primarias y secundarias', u: 'escuelas', t: T.edu, lv: 'dp', f: 'n', s: 'escuelas' },
  { k: 'escuelas_10k', l: 'Escuelas cada 10.000 habitantes', u: 'escuelas', t: T.edu, lv: 'dp', f: 'd1', s: 'escuelas' },
  { k: 'universidades', l: 'Universidades (sede principal)', u: 'universidades', t: T.edu, lv: 'dp', f: 'n', s: 'univ' },
  { k: 'graduados_1000', l: 'Graduados universitarios cada 1.000 hab.', u: 'graduados', t: T.edu, lv: 'p', f: 'd1', s: 'fundar' },

  { k: 'vab_pc', l: 'Valor agregado per cápita', u: 'Argentina = 100', t: T.trab, lv: 'p', f: 'n', s: 'fundar', div: 100, d: 'Valor agregado bruto por habitante relativo al promedio nacional (2021).' },
  { k: 'expo_musd', l: 'Exportaciones', u: 'millones de USD/año', t: T.trab, lv: 'p', f: 'n', s: 'fundar', scale: 'log', d: 'Promedio anual 2017–2019.' },
  { k: 'empleo', l: 'Empleo privado registrado', u: 'puestos', t: T.trab, lv: 'dp', f: 'n', s: 'cep', scale: 'log' },
  { k: 'empleo_1000', l: 'Empleo privado registrado cada 1.000 hab.', u: 'puestos', t: T.trab, lv: 'dp', f: 'd1', s: 'cep' },
  { k: 'establecimientos', l: 'Establecimientos productivos', u: 'establecimientos', t: T.trab, lv: 'dp', f: 'n', s: 'cep', scale: 'log' },
  { k: 'empresas_1000', l: 'Empresas privadas cada 1.000 hab.', u: 'empresas', t: T.trab, lv: 'p', f: 'd1', s: 'fundar' },
  { k: 'tasa_actividad_c', l: 'Tasa de actividad (censo)', u: '% de 14 años o más', t: T.trab, lv: 'p', f: 'd1', s: 'censo22' },
  { k: 'tasa_desoc_c', l: 'Desocupación (censo)', u: '% de la población activa', t: T.trab, lv: 'p', f: 'd1', s: 'censo22' },

  { k: 'granos_t', l: 'Producción de granos', u: 'toneladas', t: T.agro, lv: 'dp', f: 'n', s: 'magyp', scale: 'log', d: 'Suma de cereales, oleaginosas, legumbres y algodón.' },
  { k: 'pct_sembrado', l: 'Superficie sembrada con granos', u: '% de la superficie', t: T.agro, lv: 'dp', f: 'd1', s: 'magyp' },

  { k: 'potencia_mw', l: 'Potencia eléctrica instalada', u: 'MW', t: T.energia, lv: 'dp', f: 'n', s: 'centrales', scale: 'log' },

  { k: 'aeropuertos', l: 'Aeródromos y aeropuertos', u: 'aeródromos', t: T.infra, lv: 'dp', f: 'n', s: 'aeropuertos' },

  { k: 'area', l: 'Superficie', u: 'km²', t: T.terr, lv: 'dp', f: 'n', s: 'censo10', scale: 'log' },
  { k: 'elev_media', l: 'Altura media', u: 'm s. n. m.', t: T.terr, lv: 'd', f: 'n', s: 'etopo' },
  { k: 'elev_max', l: 'Altura máxima (grilla de 18 km)', u: 'm s. n. m.', t: T.terr, lv: 'dp', f: 'n', s: 'etopo' },
];

export const SECTORES = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'];
export const SECT_CORTO = {A:'Agro y pesca',B:'Minería y petróleo',C:'Industria',D:'Electricidad y gas',E:'Agua y residuos',F:'Construcción',G:'Comercio',H:'Transporte',I:'Hotelería y gastronomía',J:'Información y comunicaciones',K:'Finanzas',L:'Inmobiliarias',M:'Servicios profesionales',N:'Servicios de apoyo',O:'Administración pública',P:'Enseñanza',Q:'Salud',R:'Cultura y recreación',S:'Otros servicios'};
for (const s of SECTORES) IND.push({ k: 'sec_' + s, l: SECT_CORTO[s], u: '% del empleo privado registrado', t: T.sect, lv: 'dp', f: 'd1', s: 'cep', d: `Peso de «${SECT_CORTO[s]}» en el empleo privado registrado del lugar.` });

export const CULTIVOS = ['Soja','Maíz','Trigo','Girasol','Cebada','Sorgo','Maní','Arroz','Algodón','Poroto'];
for (const c of CULTIVOS) IND.push({ k: 'agro_' + c, l: 'Producción de ' + c.toLowerCase(), u: 'toneladas', t: T.agro, lv: 'dp', f: 'n', s: 'magyp', scale: 'log' });
export const FUELS = ['Gas','Hidráulica','Petróleo','Nuclear','Eólica','Carbón','Solar'];
for (const f of FUELS) IND.push({ k: 'mw_' + f, l: 'Potencia — ' + f.toLowerCase(), u: 'MW', t: T.energia, lv: 'dp', f: 'n', s: 'centrales', scale: 'log' });

export const BY_KEY = Object.fromEntries(IND.map(i => [i.k, i]));

// Capas de puntos y líneas
export const CAPAS = [
  { k: 'localidades', l: 'Localidades (Censo 2022)', s: 'censo22', g: 'Población' },
  { k: 'aglomerados', l: 'Pobreza en aglomerados (EPH)', s: 'eph_pob', g: 'Población' },
  { k: 'escuelas', l: 'Escuelas', s: 'escuelas', g: 'Educación' },
  { k: 'universidades', l: 'Universidades', s: 'univ', g: 'Educación' },
  { k: 'centrales', l: 'Centrales eléctricas', s: 'centrales', g: 'Energía' },
  { k: 'aeropuertos', l: 'Aeropuertos y aeródromos', s: 'aeropuertos', g: 'Transporte' },
  { k: 'puertos', l: 'Puertos', s: 'ne', g: 'Transporte' },
  { k: 'rutas', l: 'Rutas principales', s: 'ne', g: 'Transporte' },
  { k: 'ferrocarriles', l: 'Ferrocarriles', s: 'ne', g: 'Transporte' },
  { k: 'parques', l: 'Parques nacionales', s: 'parques', g: 'Naturaleza' },
  { k: 'rios', l: 'Ríos y lagos', s: 'ne', g: 'Naturaleza' },
  { k: 'glaciares', l: 'Glaciares', s: 'ne', g: 'Naturaleza' },
  { k: 'relieve', l: 'Relieve', s: 'etopo', g: 'Naturaleza' },
];
