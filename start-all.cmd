@echo off
title 智慧校园系统 - 一键启动
echo ============================================
echo    智慧校园系统 - 一键全面启动
echo ============================================
echo.
echo [0/3] 正在启动 MySQL / Redis / 后端 / 前端...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-project.ps1"
echo.
echo [1/3] 正在打开管理端页面 (http://127.0.0.1/) ...
start "" "http://127.0.0.1/"
echo [2/3] 正在打开微信开发者工具与本项目小程序...
if exist "D:\wx_tool\微信web开发者工具\微信开发者工具.exe" (
    powershell -NoProfile -Command "Start-Process -FilePath 'D:\wx_tool\微信web开发者工具\微信开发者工具.exe' -RedirectStandardOutput 'D:\ruoyi\shixun\.local\temp\devtools.out.log' -RedirectStandardError 'D:\ruoyi\shixun\.local\temp\devtools.err.log'"
    echo       已启动微信开发者工具（如已运行会自动切换到该项目窗口）
) else (
    echo       [警告] 未找到微信开发者工具，请手动打开 D:\wx_tool\微信web开发者工具
)
echo [3/3] 全部完成
echo.
echo ============================================
echo    管理端: http://127.0.0.1/   (admin / admin123)
echo    后端:   http://127.0.0.1:8020/
echo    日志:   D:\ruoyi\shixun\.local\temp
echo    按任意键关闭本窗口
echo ============================================
pause >nul
