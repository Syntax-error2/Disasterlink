import re

with open('app/Http/Controllers/IncidentReportController.php', 'r') as f:
    content = f.read()

# Add the helper function
helper_func = """
    private function clearIncidentCaches()
    {
        \Illuminate\Support\Facades\Cache::forget('incidents_lgu_guest');
        \Illuminate\Support\Facades\Cache::forget('incidents_lgu_'); // For citizens (lgu_id = null)
        
        $lgus = \App\Models\Lgu::pluck('id');
        foreach ($lgus as $lgu) {
            \Illuminate\Support\Facades\Cache::forget('incidents_lgu_' . $lgu);
        }
    }

    public function store(Request $request)"""

content = content.replace("    public function store(Request $request)", helper_func)

# Regex to match the cache block (handling variable indentation)
cache_block_regex = r"[ \t]*\\Illuminate\\Support\\Facades\\Cache::forget\('incidents_lgu_guest'\);\s*if \(auth\(\)->check\(\)\) \{\s*\\Illuminate\\Support\\Facades\\Cache::forget\('incidents_lgu_' \. auth\(\)->user\(\)->lgu_id\);\s*\}"

content = re.sub(cache_block_regex, "            $this->clearIncidentCaches();", content)

with open('app/Http/Controllers/IncidentReportController.php', 'w') as f:
    f.write(content)
