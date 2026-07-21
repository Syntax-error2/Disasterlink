const https = require('https');
const fs = require('fs');

const url = 'https://nominatim.openstreetmap.org/search?q=Binalbagan,Philippines&polygon_geojson=1&format=json';

https.get(url, { headers: { 'User-Agent': 'DisasterLink/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.length > 0) {
      const geojson = json[0].geojson;
      const feature = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: { name: 'Binalbagan' },
            geometry: geojson
        }]
      };
      fs.mkdirSync('src/assets', { recursive: true });
      fs.writeFileSync('src/assets/binalbagan.json', JSON.stringify(feature));
      console.log('GeoJSON saved.');
    } else {
      console.log('Not found.');
    }
  });
});
