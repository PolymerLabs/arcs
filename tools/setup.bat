
@ECHO OFF

echo "0. Install Chocolatey package manager"
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

echo "1. Install nvm"
choco install nvm

echo "2. Install node"
nvm install && nvm use

echo "3. Install dependencies"
npm ci
