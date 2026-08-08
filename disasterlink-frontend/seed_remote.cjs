const axios = require('axios');

const API_BASE = 'https://darkgoldenrod-anteater-579870.hostingersite.com/api';

async function seedRemote() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post(`${API_BASE}/login`, {
            email: 'admin@disasterlink.com',
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        console.log("Logged in successfully! Token obtained.");
        
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        };

        console.log("Creating Alpha Strike Team...");
        const teamRes = await axios.post(`${API_BASE}/teams`, {
            name: 'Alpha Strike Team',
            category: 'Medical Emergency Rescue'
        }, config);
        console.log("Team created:", teamRes.data);

        console.log("Creating Alpha Responder...");
        const userRes = await axios.post(`${API_BASE}/admin/users`, {
            name: 'Alpha Responder 1',
            email: 'alpha@test.com',
            phone: '09123456780',
            role: 'responder'
        }, config);
        console.log("Responder created:", userRes.data);
        
        console.log("DONE SEEDING.");
        
    } catch (e) {
        console.error("Error seeding:", e.response ? e.response.data : e.message);
    }
}

seedRemote();
