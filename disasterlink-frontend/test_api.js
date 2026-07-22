const fetch = require('node-fetch');
async function test() {
    try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure&hourly=precipitation&timezone=Asia%2FManila&forecast_days=2";
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) console.log("ERROR:", data.reason);
        else console.log("SUCCESS:", data.current);
    } catch (e) {
        console.log("FETCH ERR:", e.message);
    }
}
test();
