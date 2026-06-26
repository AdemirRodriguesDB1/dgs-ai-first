@echo off
REM Use Node 18 from Scoop for this project
SET NODE18=%USERPROFILE%\scoop\apps\nvm\current\nodejs\v18.20.0\node.exe
SET NPM18=%USERPROFILE%\scoop\apps\nvm\current\nodejs\v18.20.0\npm.cmd

REM Add Node 18 to PATH
SET PATH=%USERPROFILE%\scoop\apps\nvm\current\nodejs\v18.20.0;%PATH%

REM Display versions
echo Using Node:
"%NODE18%" --version
echo Using npm:
"%NPM18%" --version
echo.

REM Run the requested command or default to npm scripts menu
if "%1"=="" (
  echo Available commands:
  echo   use-node18              - Activate Node 18 in current shell
  echo   npm run build           - Build the project
  echo   npm run mcp:evidence    - Generate MCP evidence
  echo   npm run mcp:evidence:git-only - Git-only evidence
  exit /b 0
)

REM If first arg is "use-node18", show how to use it
if "%1"=="use-node18" (
  echo To use Node 18 in a PowerShell session, run:
  echo   $env:PATH = "%USERPROFILE%\scoop\apps\nvm\current\nodejs\v18.20.0;" + $env:PATH
  exit /b 0
)

REM Otherwise, run npm with remaining args
"%NPM18%" %*
