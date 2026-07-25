Set WshShell = CreateObject("WScript.Shell")

WshShell.Run "cmd /c cd /d C:\Users\daveh\Documents\DevProjects\disasterlink-backend && php artisan serve > hidden_php.log 2>&1", 0, False
WshShell.Run "cmd /c cd /d C:\Users\daveh\Documents\DevProjects\disasterlink-frontend && npm run dev > hidden_vite.log 2>&1", 0, False
WshShell.Run "cmd /c cd /d C:\Users\daveh\Documents\DevProjects\disasterlink-backend && node tunnel.cjs > hidden_tunnel.log 2>&1", 0, False

Set WshShell = Nothing
