const fs = require('fs');
let content = fs.readFileSync('app/Http/Controllers/IncidentReportController.php', 'utf8');
content = content.replace(/event\(new IncidentEvent/g, "$this->safeBroadcast(new IncidentEvent");
fs.writeFileSync('app/Http/Controllers/IncidentReportController.php', content);
