const ngrok = require('@ngrok/ngrok');

(async function() {
  try {
    console.log("Starting Ngrok Static Tunnel via native Node bindings...");
    const listener = await ngrok.forward({
      addr: 8000,
      authtoken: '3H0XlR2jLhafj617wPuQhAREoNO_4YSpZcnivrMGQ3reM9QrN',
      domain: 'spoiler-hanky-prideful.ngrok-free.dev'
    });
    console.log("=====================================================");
    console.log("SUCCESS! Ngrok Static Tunnel is LIVE!");
    console.log("Mobile App API URL: " + listener.url());
    console.log("=====================================================");
    console.log("Do NOT close this window. You can minimize it.");
    
    // Keep the process alive indefinitely
    process.stdin.resume();
  } catch (error) {
    console.error("Failed to start Ngrok tunnel:", error);
  }
})();
