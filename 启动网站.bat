@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   正在启动「吉利 3D 虚拟展厅」本地服务器...
echo   浏览器会自动打开 http://localhost:5173/
echo   （如果没自动打开，请手动在浏览器输入上面的地址）
echo   关闭本窗口即可停止服务器
echo ============================================
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173/"
call npm run dev
pause
