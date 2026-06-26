# 🚀 Setup NVM para Gerenciar Node.js

Este projeto usa **Node.js 18.20.0** para suportar MCP servers e TypeScript moderno. O seu ambiente tem Node 14 para projetos legados. Use **NVM** para gerenciar ambas versões.

## ✅ Status Atual

- **NVM:** Instalado via Scoop (1.2.2)
- **Node 18.20.0:** Instalado para este projeto ✅
- **Node 16.20.0:** Disponível como fallback
- **Node 14.15.5:** Deixada para projetos legacy

## 📋 Como Usar

### 1. Ativar Node 18 para este projeto

```powershell
# Abra PowerShell e rode:
$env:PATH = "$env:USERPROFILE\scoop\apps\nvm\current\nodejs\v18.20.0;" + $env:PATH
node --version  # deve mostrar v18.20.0
npm --version   # deve mostrar compatível com Node 18
```

### 2. Ou use o script auxiliar (Windows)

```powershell
.\use-node18.bat
.\use-node18.bat npm run build
.\use-node18.bat npm run mcp:evidence
```

### 3. Para outros projetos, voltar para Node 14

```powershell
# Use o Node 14 instalado globalmente ou:
nvm use 14.21.3  # versão estável da série 14
```

## 🎯 Comandos Úteis

| Comando | O que faz |
|---------|----------|
| `nvm list` | Lista versões Node instaladas |
| `nvm install 20.0.0` | Instala uma nova versão |
| `$env:PATH = "$env:USERPROFILE\scoop\apps\nvm\current\nodejs\v18.20.0;" + $env:PATH` | Ativa Node 18 na sessão atual |

## 📍 Estrutura do Projeto

- `.nvmrc` — Define a versão esperada do Node (18.20.0)
- `use-node18.bat` — Script auxiliar Windows para rodar npm com Node 18
- `scripts/generate_mcp_evidence.py` — Gera evidência real dos MCP servers
- `scripts/run-mcp-evidence.ps1` — PowerShell wrapper

## ✨ Evidência MCP Completa

Com Node 18, execute:

```bash
npm run mcp:evidence        # Git + Filesystem (completo)
npm run mcp:evidence:git-only  # Só Git (rápido)
npm run mcp:evidence:py     # Direto com Python
```

Resultado esperado: `mcp-evidence.json` com todos 3 servers status "ok".

## 🔧 Troubleshooting

**Problema:** `npm: command not found`
```powershell
# Solução: Garantir PATH com Node 18
$env:PATH = "$env:USERPROFILE\scoop\apps\nvm\current\nodejs\v18.20.0;" + $env:PATH
```

**Problema:** MCP timeout
```powershell
# Com Node 14, é esperado. Use Node 18:
npm run mcp:evidence:git-only  # Funciona com Node 14
npm run mcp:evidence          # Requer Node 18
```

**Problema:** Scoop não encontrado
```powershell
# Reinstale Scoop
iwr -useb get.scoop.sh | iex
scoop install nvm
```

## 📚 Referências

- [NVM Windows](https://github.com/coreybutler/nvm-windows)
- [Scoop Package Manager](https://scoop.sh/)
- Projeto: novatech-assistant (RAG + MCP)

---

**Status:** ✅ Configurado e testado (2026-06-15)
