
$ROOT = ( get-item $scriptPath ).Directory.parent.parent.FullName

# Stop when error occurs
$ErrorActionPreference = "Stop"

$ChocoInstalled = $false

function local:Status([String] $Message){
  Write-Host $Message -ForegroundColor DarkMagenta
}


Status("1. Install nvm")
if (Get-Command choco.exe -ErrorAction SilentlyContinue) {
  $ChocoInstalled = $true
  choco install nvm
} else {
  Install-Module -Name nvm
}

Status("1.1 Ensure nvm is in your current process")
if($ChocoInstalled) {
  refreshenv
} else {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Status("2. Install Node")
CD $ROOT
nvm install
nvm use

Status("3. Install dependencies")
CD $ROOT
npm ci


