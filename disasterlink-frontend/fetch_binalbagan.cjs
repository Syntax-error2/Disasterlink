const https = require('https');
const fs = require('fs');

const query = '[out:json];relation["name"="Binalbagan"]["admin_level"="6"];out geom;';
const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

https.get(url, { headers: { 'User-Agent': 'NodeJS' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const elements = json.elements;
    if (elements && elements.length > 0) {
      const rel = elements[0];
      let coords = [];
      rel.members.forEach(m => {
        if (m.type === 'way' && m.geometry) {
          coords.push(m.geometry.map(g => [g.lon, g.lat]));
        }
      });
      const geojson = {
        type: 'Feature',
        properties: { name: 'Binalbagan' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[coords[0]]] // This is a rough approximation but since overpass gives ways, we can format it as MultiLineString for borders, or we can use a simpler Polygon.
        }
      };
      
      const geojsonLine = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { name: 'Binalbagan' },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: coords
                }
            }
        ]
      }
      
      fs.mkdirSync('src/assets', { recursive: true });
      fs.writeFileSync('src/assets/binalbagan.json', JSON.stringify(geojsonLine));
      console.log('GeoJSON saved.');
    } else {
      console.log('Not found.');
    }
  });
});
