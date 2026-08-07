const axios = require('axios');

async function testFullFlow() {
    const apiBase = 'https://darkgoldenrod-anteater-579870.hostingersite.com/api';
    try {
        console.log("Logging in as Admin...");
        const loginResp = await axios.post(apiBase + '/login', {
            email: "admin@disasterlink.gov.ph",
            password: "password"
        });
        const token = loginResp.data.token;
        console.log("Logged in Admin user.");

        console.log("Sending SOS...");
        const sosResp = await axios.post(apiBase + '/incidents', {
            reporting_barangay: "Santo Rosario",
            incident_type: "SOS Emergency",
            severity_level: "Critical",
            exact_location: "Test Location",
            details: "URGENT SOS SIGNAL from Test User. Immediate dispatch required!",
            status: "Active",
            latitude: "10.1866",
            longitude: "122.8587",
            reporting_user: "Test SOS User"
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log("SOS Success!", sosResp.data);
    } catch (error) {
        if (error.response) {
            console.log("API Error Status:", error.response.status);
            console.log("API Error Data:", error.response.data);
        } else {
            console.log("Error:", error.message);
        }
    }
}

testFullFlow();
