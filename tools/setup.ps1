
$ROOT = ( get-item $PSScriptRoot ).Directory.parent.parent.FullName


# Stop when error occurs
$ErrorActionPreference = "Stop"

$ChocoInstalled = $false

function local:Status([String] $Message){
  Write-Host $Message -ForegroundColor DarkMagenta
}


Status("1. Install nvm")
Install-Module -Name nvm

Status("1.1 Ensure nvm is in your current process")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Status("2. Install Node")
Write-Host $MyInvocation.MyCommand.Path
Write-Host $PSScriptRoot
Write-Host $ROOT
Write-Host ( get-item $PSScriptRoot ).Directory.parent.parent.FullName
Write-Host (Get-Item -Path ".\").Parent.FullName
Write-Host (Get-Item -Path ".\").Parent.Parent.FullName
Get-Location
Set-Location -Path ..
Install-NodeVersion
Set-NodeVersion -Persist User

Status("3. Install dependencies")
npm ci


