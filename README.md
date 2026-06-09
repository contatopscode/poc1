# SquadIA POC — Auto Update Pipeline

POC para validar o pipeline end-to-end de auto-update do **SquadIA 4.0** antes de aplicar no app real.

**Stack**: Electron 34 + electron-updater + GitHub Releases público (`contatopscode/poc1`)
**Objetivo**: provar que `git tag → GitHub Action → update silencioso na máquina do dev` funciona em Windows/Mac/Linux.

---

## O que este POC NÃO cobre (deixado para a fase 2)

- ❌ Code signing real (Windows EV cert + Apple notarização) — POC roda _unsigned_, SmartScreen/Gatekeeper vão alertar
- ❌ Integração com Intune
- ❌ Migração do Next.js + Claude SDK real
- ❌ Backend Redis/cron centralizado

Tudo isso entra depois que o mecanismo de update for validado aqui.

---

## Setup inicial (uma vez)

### 1. Criar o repo público no GitHub

```bash
# Já criado: https://github.com/contatopscode/poc1
```

### 2. Configurar git local

```bash
cd /Users/paulosiqueira/Documents/PS-Code/Claude-SDK/squadia-poc-autoupdate
git init
git add .
git commit -m "feat: initial POC scaffolding"
git branch -M main
git remote add origin https://github.com/contatopscode/poc1.git
git push -u origin main
```

### 3. Instalar dependências

```bash
npm install
```

Isso baixa Electron + electron-builder + electron-updater (~250MB em `node_modules/`).

### 4. Testar em modo dev (sem publicar)

```bash
npm start
```

Abre uma janela Electron mostrando:

- Versão atual do app
- Botão "Verificar atualização"
- Status do updater
- Info de ambiente (Electron, Node, Chrome)

Como ainda não há release publicado, o status vai mostrar "Você está na versão mais recente" ou um erro de 404 se rodar fora do ambiente de release (esperado).

---

## Fluxo de release (o teste do POC)

### Passo 1: Primeiro release (v1.0.0)

```bash
# Criar a tag e dar push
git tag v1.0.0
git push origin v1.0.0
```

Isso dispara o workflow `.github/workflows/release.yml`:

- Builda nas 3 plataformas (Windows MSI, Mac DMG, Linux AppImage)
- Publica no GitHub Releases como **draft**
- Você abre a release no GitHub e clica em "Publish" para tornar pública

### Passo 2: Instalar a v1.0.0 na sua máquina

Baixa o instalador da release publicada:

- **Mac**: `SquadIA POC-1.0.0-arm64.dmg` (ou `x64`)
- **Windows**: `SquadIA POC-Setup-1.0.0.exe`
- **Linux**: `SquadIA POC-1.0.0.AppImage`

Instala normalmente. Vai dar warning de "app não verificado" porque não tem code signing — clica em "Abrir mesmo assim".

### Passo 3: Criar a v1.0.1 (a magia acontece aqui)

Edite o `package.json` e bump da versão:

```json
"version": "1.0.1"
```

Faça uma mudança trivial em `index.html` ou `styles.css` para ver a diferença visual.

```bash
git add .
git commit -m "feat: bump to v1.0.1"
git tag v1.0.1
git push origin main v1.0.1
```

Aguarde ~5 min para o GitHub Actions buildar e publicar.

### Passo 4: Validar o auto-update

Abra o **SquadIA POC v1.0.0** que você instalou na sua máquina:

- Ao abrir, o app verifica automaticamente
- Em poucos segundos, status muda para "Nova versão v1.0.1 disponível, baixando…"
- Barra de progresso roda
- Quando termina: dialog "Reiniciar agora?" → clica
- App reinicia na v1.0.1 com a mudança visual aplicada

**Se isso funcionar end-to-end nas 3 plataformas, o POC está validado.** ✅

---

## Estrutura do projeto

```
squadia-poc-autoupdate/
├── package.json              ← config Electron + electron-builder + publish
├── main.js                   ← Electron main process + autoUpdater
├── preload.js                ← bridge segura main ↔ renderer (contextIsolation)
├── index.html                ← UI da janela
├── renderer.js               ← lógica frontend do status de update
├── styles.css                ← estilo da UI
├── build/                    ← assets de build (ícones — preencher fase 2)
├── .github/
│   └── workflows/
│       └── release.yml       ← matrix build Win/Mac/Linux
├── .gitignore
└── README.md
```

---

## Scripts disponíveis

| Comando              | O que faz                                             |
| -------------------- | ----------------------------------------------------- |
| `npm start`          | Roda em modo dev (Electron abre a janela)             |
| `npm run dist`       | Builda o instalador da plataforma atual (não publica) |
| `npm run dist:win`   | Força build Windows (precisa estar em Windows)        |
| `npm run dist:mac`   | Força build Mac (precisa estar em Mac)                |
| `npm run dist:linux` | Força build Linux                                     |
| `npm run release`    | Builda + publica no GitHub Releases (usado pelo CI)   |

---

## Troubleshooting

### "Cannot find module electron-updater"

Rode `npm install` novamente.

### Auto-update não dispara em dev (`npm start`)

**Comportamento esperado.** O electron-updater só funciona em apps empacotados (após `electron-builder`). Em dev, o `checkForUpdatesAndNotify` é silenciosamente ignorado.

### "404 Not Found" ao verificar update

Normalmente significa:

1. Ainda não há release publicada no `contatopscode/poc1` (precisa ter pelo menos `v1.0.0` publicada antes que o updater encontre algo)
2. O nome do repo no `package.json` (`build.publish.repo`) não bate com o nome real no GitHub
3. Em **produção** (repo privado): faltam credenciais. Usar `GH_TOKEN` via variável de ambiente ou config criptografada

### Windows: "SmartScreen impediu a execução"

Esperado em POC sem code signing. Clica em "Mais informações" → "Executar mesmo assim". Na fase 2 com certificado EV, esse warning some.

### Mac: "App is damaged and can't be opened"

Mac Gatekeeper bloqueia apps não-notarizados. Workaround para POC:

```bash
xattr -cr "/Applications/SquadIA POC.app"
```

Na fase 2 com Apple Developer + notarização, esse problema some.

---

## Próximos passos (após POC validado)

1. **Code signing Windows**: comprar cert EV (~$300-500/ano)
2. **Apple Developer Program**: $99/ano + configurar notarização no workflow
3. **Migrar a stack real**: trazer Next.js 16 + Claude SDK pra dentro deste shell Electron
4. **Repo de releases privado**: migrar do `poc1` público pra um repo privado (`contatopscode/squadia-releases`) com `GH_TOKEN` configurado, mantendo o código fonte em outro repo
5. **Intune integration**: empacotar o MSI como Win32 app no Intune e empurrar pro AD group "SquadIA"
6. **Backend central**: subir Redis + node-cron num servidor interno Blue

---

## Referências

- [electron-updater docs](https://www.electron.build/auto-update)
- [electron-builder publish config](https://www.electron.build/configuration/publish)
- [GitHub Actions Electron pattern](https://www.electron.build/multi-platform-build#sample-githubworkflowsmainyml)
