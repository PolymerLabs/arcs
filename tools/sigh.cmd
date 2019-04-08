@echo off

for %%f in ("tools/sigh.ts") do set ts_time=%%~tf
for %%f in ("build/sigh.js") do set js_time=%%~tf
if %ts_time:~0,10% gtr %js_time:~0,10% do (
  node_modules\.bin\tsc -p tools
)
if %errorlevel% == 0 (
  call node %~d0%~sp0\..\build\sigh.js %*
)
