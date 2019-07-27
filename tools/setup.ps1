# Stop when error occurs
# $ErrorActionPreference = "Stop"

$root = (Get-Item -Path $PSScriptRoot).Parent.FullName
$version = Get-Content -Path $root\.nvmrc
$url = "https://nodejs.org/dist/$version/node-$version-x64.msi"

$ChocoInstalled = $false

function local:Status([String] $Message){
  Write-Host $Message -ForegroundColor DarkMagenta
}

Status("1. Install nvm")
Install-Module -Name nvm

Status("1.1 Ensure nvm is in your current process")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Status("2. Install Node")
Set-Location -Path $root
Install-NodeVersion
Set-NodeVersion -Version $version

Status("3. Update npm to latest version")
npm install -g npm@latest

Status("4. Failsafe: manually download node if necessary")
If(node --version -eq $version) {
  Status("...skipping, version satisfied")
} else {
  $node_msi = $PSScriptRoot\"node.msi"
  $start_time = Get-Date
  $wc = New-Object System.Net.WebClient
  $wc.DownloadFile($url, $node_msi)
  Write-Output "Node downloaded"
  Write-Output "Time taken $((Get-Date).Subtract($start_time).Seconds) second(s)"

  Start-Process $node_msi -Wait
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Status("4. Install dependencies")
node --version
npm --version
npm ci


