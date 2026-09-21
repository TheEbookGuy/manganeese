# MANGANEX — SIH GIS Prototype

AI + ML + Space Technology concept website for:
"Using AI/ML and space technology to identify manganese reserves and overcome production shortfalls."

## Files
- index.html — dashboard structure + Google Maps loader
- style.css — responsive UI
- script.js — map, markers, GIS-style layers, filters and demo AI analysis
- config.js — configuration notes

## Run
1. Get a Google Maps JavaScript API key from Google Cloud.
2. Enable Maps JavaScript API.
3. In index.html replace:
   YOUR_GOOGLE_MAPS_API_KEY
   with your key.
4. Open with a local server (recommended), e.g. VS Code Live Server.

## Important
The manganese zones and production numbers in this prototype are illustrative demonstration data. They must NOT be presented as verified reserves, official mineral-resource estimates, or official production statistics.

## How to turn this into the SIH technical solution
Replace the demo `zones` array in script.js with official/validated GIS data (GeoJSON/KML or a backend API), then add:
- satellite-derived spectral indices/features
- DEM/elevation/slope
- geological maps and lithology
- geochemical/geophysical observations
- ML model inference API
- official production/demand datasets
- uncertainty/confidence maps
- role-based dashboard and audit trail
- export to PDF/CSV/GeoJSON

Google Maps Data Layer supports GeoJSON and geographic points/lines/polygons, making it suitable for a GIS visualization layer.
