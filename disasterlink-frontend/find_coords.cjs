const axios = require('axios');

async function search(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`;
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'DisasterLink/1.0' }});
    console.log(`--- ${query} ---`);
    res.data.slice(0, 3).forEach(d => console.log(`${d.display_name}: lat ${d.lat}, lon ${d.lon}`));
  } catch (e) {
    console.error(e.message);
  }
}

async function main() {
  await search('Binalbagan Municipal Hall');
  await search('Binalbagan Fire Station');
  await search('Binalbagan Infirmary');
  await search('Binalbagan, Negros Occidental');
  await search('Rizal Street, Binalbagan');
}

main();
