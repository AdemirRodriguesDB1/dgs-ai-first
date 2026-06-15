Param(
    [string]$Mode = "full",
    [string]$PythonExe = "python"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$Generator = Join-Path $ScriptDir "generate_mcp_evidence.py"

if (-not (Test-Path $Generator)) {
    Write-Error "Script nao encontrado: $Generator"
    exit 1
}

Set-Location $RepoRoot

# Convert mode to --flag format for Python
$PyMode = "--$Mode"

if ($Mode -eq "git-only") {
    Write-Host "Executando geracao de evidencia MCP (apenas Git)..."
} else {
    Write-Host "Executando geracao de evidencia MCP (completo)..."
}

& $PythonExe $Generator $PyMode

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao gerar evidencia MCP. Codigo: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Concluido. Arquivo de saida: $RepoRoot\mcp-evidence.json"