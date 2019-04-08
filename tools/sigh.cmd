@echo off

call node %~d0%~sp0\..\tools\cmp_dates.js tools/sigh.ts build/sigh.js

if %errorlevel% == 1 (
  call node_modules\.bin\tsc -p tools
)

if %errorlevel% == 0 (
  call node %~d0%~sp0\..\build\sigh.js %*
)
