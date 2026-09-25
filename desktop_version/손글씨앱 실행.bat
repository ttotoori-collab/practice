@echo off
rem ------------------------------------------------------------
rem  Launcher for the handwritten-digit recognition app (app.py).
rem  Double-click this file in Explorer to start the app.
rem
rem  NOTE (in English on purpose): cmd.exe cannot reliably parse a
rem  .bat file that contains multi-byte characters such as Hangul.
rem  Korean comments here break the launcher, so this one file is
rem  kept ASCII-only. See README.md for the Korean explanation.
rem ------------------------------------------------------------

rem Move to the folder that contains this batch file (%~dp0).
cd /d "%~dp0"

rem pythonw.exe runs a GUI script without opening a console window.
set "PYTHONW=C:\Users\USER\AppData\Local\Programs\Python\Python314\pythonw.exe"

rem Fall back to whatever pythonw.exe is on PATH.
if not exist "%PYTHONW%" set "PYTHONW=pythonw.exe"

rem The empty "" is the window-title argument that start requires.
start "" "%PYTHONW%" "%~dp0app.py"
