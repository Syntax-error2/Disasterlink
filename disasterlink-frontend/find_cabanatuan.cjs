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
  await search('Cabanatuan City Hall');
  await search('Cabanatuan Fire Station');
  await search('Cabanatuan City Hospital');
  await search('Paulino J. Garcia Memorial Research and Medical Center'); // Major hospital in Cabanatuan
  await search('Cabanatuan, Nueva Ecija');
}

main();
