@echo off
chcp 65001 >nul
title booklet 로컬 서버

where python >nul 2>nul
if %errorlevel% equ 0 (
    python booklet.py serve
    goto end
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    py booklet.py serve
    goto end
)

echo ======================================================================
echo   [안내] booklet을 실행하려면 'Python(파이썬)'이 필요합니다.
echo ======================================================================
echo.
echo   컴퓨터에 아직 파이썬이 설치되어 있지 않습니다.
echo   1분 만에 설치하실 수 있도록 파이썬 공식 사이트를 엽니다.
echo.
echo   [설치 시 가장 중요한 팁!]
echo   설치 창 맨 아래의 [Add python.exe to PATH] 체크박스를 꼭 체크하세요!
echo.
echo   설치가 끝나면 이 창을 닫고 다시 'start_windows.bat'을 더블 클릭하세요!
echo ======================================================================
echo.
start https://www.python.org/downloads/
pause

:end
