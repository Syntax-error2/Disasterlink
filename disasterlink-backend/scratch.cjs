const fs = require('fs');

let content = fs.readFileSync('app/Http/Controllers/IncidentReportController.php', 'utf8');

const helperFunc = `    private function clearIncidentCaches()
    {
        \\Illuminate\\Support\\Facades\\Cache::forget('incidents_lgu_guest');
        \\Illuminate\\Support\\Facades\\Cache::forget('incidents_lgu_'); // For citizens (lgu_id = null)
        
        $lgus = \\App\\Models\\Lgu::pluck('id');
        foreach ($lgus as $lgu) {
            \\Illuminate\\Support\\Facades\\Cache::forget('incidents_lgu_' . $lgu);
        }
    }

    public function store(Request $request)`;

content = content.replace("    public function store(Request $request)", helperFunc);

const cacheBlockRegex = /[ \t]*\\Illuminate\\Support\\Facades\\Cache::forget\('incidents_lgu_guest'\);\s*if \(auth\(\)->check\(\)\) \{\s*\\Illuminate\\Support\\Facades\\Cache::forget\('incidents_lgu_' \. auth\(\)->user\(\)->lgu_id\);\s*\}/g;

content = content.replace(cacheBlockRegex, "            $this->clearIncidentCaches();");

fs.writeFileSync('app/Http/Controllers/IncidentReportController.php', content);
