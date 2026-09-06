# Build 1.1.0 — AR and scientific layer repair

## Materials

The original GLB relied on vertex colors without an explicit PBR material. The original USDZ relied on a display-color primvar. This update bakes the per-face palette into an embedded PNG and supplies UV coordinates and explicit material bindings in both formats. USDZ entries are uncompressed and 64-byte aligned. Original geometry is retained. The web renderer uses matching updated colors. The model is illustrative, not a georeferenced reconstruction of the featured site.

## Application behavior

The default camera action stays in the existing branded viewer rather than automatically handing off to a separate native viewer. Manual camera composition and device-tracked floor AR have distinct labels. On WebXR devices, requiring DOM overlay prevents an unbranded immersive-only route. Device support and permission are handled at runtime. The native viewers remain optional.

Requests are limited to five concurrent visible tiles. Old requests are cancelled on pan, date change and layer removal. Loading, received, partial and unavailable states are separate. A bounded cache is retained; explicit refresh clears active cached responses. Raster failure, cross-origin mask failure, sparse missing vector tiles and feature transfer limits are not converted into habitat presence or absence.

## Dataset transports

### Seagrass meadows

UNEP-WCMC / Short · Global compilation · v7.1 source series

Mapped occurrences. Published point and polygon records from field surveys, literature and remote sensing. Mapped presence is not a complete census; blank areas can be unobserved.

Primary: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/Global_Distribution_of_Seagrasses/VectorTileServer`

Alternative — **WCMC ArcGIS mirror · check service edition**: `https://tiles.arcgis.com/tiles/Mj0hjvkNtV7NRhA7/arcgis/rest/services/Global_Distribution_of_Seagrasses/VectorTileServer`

### Mangrove forests

GMW / UNEP-WCMC · 2020 · version 3

Satellite-derived extent. The 2020 mangrove extent layer combines radar and optical earth observation. Historical service layers are not drawn on top of 2020.

Primary: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/Global_Mangrove_Watch/MapServer`

Alternative — **Same 2020 extent · direct feature transport**: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/Global_Mangrove_Watch/FeatureServer`

### Tidal salt marshes

UNEP-WCMC · Published global compilation · v6

Mapped occurrences. A global compilation of mapped saltmarsh polygons and occurrence points. Coverage and survey dates vary by country.

Primary: `https://data-gis.unep-wcmc.org/server/rest/services/HabitatsAndBiotopes/Global_Distribution_of_Saltmarshes/MapServer`

Alternative — **WCMC vector publication · check service edition**: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/Global_Distribution_of_Saltmarshes/VectorTileServer`

Alternative — **WCMC ArcGIS mirror · check service edition**: `https://tiles.arcgis.com/tiles/Mj0hjvkNtV7NRhA7/arcgis/rest/services/Global_Distribution_of_Saltmarshes/VectorTileServer`

### Tropical forests

ESA WorldCover / Terrascope · 2021 · 10 m classification

Satellite-derived tree cover. Tree-cover class highlighted within 23.44° north/south. Includes plantations and other tree cover: it is not a map of intact rainforest. WMS is a visualization service, not an area-measurement product.

Primary: `https://titiler.terrascope.be/wms`

WMS layer: `esa-worldcover-map-10m-2021-v2_map`

Alternative — **Legacy WorldCover 2021 service**: `https://services.terrascope.be/wms/v2`

### Kelp forests

Jayathilake & Costello / UNEP-WCMC · 2020 study

Modelled suitable distribution. A published model of the global kelp biome. It represents modelled habitat suitability, not a live satellite inventory or proof of kelp in each location.

Primary: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/A_Modelled_Global_Distribution_of_the_Kelp_Biome_/MapServer`

Alternative — **Same study · direct feature transport**: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/A_Modelled_Global_Distribution_of_the_Kelp_Biome_/FeatureServer`

### Phytoplankton

NASA GIBS / Aqua MODIS · Daily observation · choose date

Satellite pigment proxy. Near-surface chlorophyll-a in mg/m³. Clouds and missing overpasses create gaps. Pigment concentration is not a species census or carbon credit estimate. The multi-colour badge identifies the continuous layer; use the publisher legend for numerical interpretation.

Primary: `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi`

WMS layer: `MODIS_Aqua_L2_Chlorophyll_A`

### Coral reefs

UNEP-WCMC · 2021 · version 4.1

Mapped reef distribution. Mapped warm-water reef points and polygons. This is habitat extent, not live coral condition, bleaching severity or cold-water coral coverage.

Primary: `https://data-gis.unep-wcmc.org/server/rest/services/HabitatsAndBiotopes/Global_Distribution_of_Coral_Reefs/MapServer`

Alternative — **WCMC vector publication · check service edition**: `https://data-gis.unep-wcmc.org/server/rest/services/Hosted/Global_Distribution_of_Coral_Reefs/VectorTileServer`

## Verification of provider metadata

The newer Terrascope OGC documentation identifies `https://titiler.terrascope.be/wms` and `esa-worldcover-map-10m-2021-v2_map` for the 2021 classification. The older service is retained only as a secondary transport.

Terrascope documentation: https://docs.terrascope.be/Developers/WebServices/OGC/WMTSv2.html
UNEP-WCMC hosted-service registry: https://data-gis.unep-wcmc.org/server/rest/services/Hosted
UNEP-WCMC ArcGIS tile registry: https://tiles.arcgis.com/tiles/Mj0hjvkNtV7NRhA7/arcgis/rest/services
NASA chlorophyll layer naming: https://www.earthdata.nasa.gov/news/blog/changes-chlorophyll-layers

Provider metadata/publication paths were checked separately from the browser adapter tests. Not every live tile service could be verified end-to-end in the build environment. The kelp provider timed out during a live metadata request. The included diagnostics page is intended to establish actual delivery from the deployed site and the user's network, not to imply those services are always available.
