@echo OFF&setlocal

:Fail
echo %~1
EXIT /B 1

:Status
echo %~1
EXIT /B 0

Rem https://chocolatey.org/install
call :Status "0. Install Chocolatey package manager"
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

call :Status "1. Install nvm"
choco install nvm

call :Status "2. Install node"
nvm install && nvm use

call :Status "3. Install dependencies"
npm ci
