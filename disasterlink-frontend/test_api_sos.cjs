const axios = require('axios');

async function testSOSAPI() {
    const apiBase = 'https://darkgoldenrod-anteater-579870.hostingersite.com/api';
    const token = '114|hUh1xj3r0m3k0NkqL7IndYpTbRclNOP6gdMz8qHZ6b59d60d';
    try {
        console.log("Sending SOS via API...");
        const sosResp = await axios.post(apiBase + '/incidents', {
            reporting_barangay: "Santo Rosario",
            incident_type: "SOS Emergency",
            severity_level: "Critical",
            exact_location: "Test API Location",
            details: "URGENT SOS SIGNAL from API. Immediate dispatch required!",
            status: "Active",
            latitude: "10.1866",
            longitude: "122.8587",
            reporting_user: "Test API User"
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

testSOSAPI();
