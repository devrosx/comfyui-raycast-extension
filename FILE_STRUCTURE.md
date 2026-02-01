# 📋 Přehled souborů projektu

## 📖 Dokumentace (začněte zde!)

| Soubor | Co obsahuje | Pro koho |
|--------|-------------|----------|
| **INDEX.md** | 🏠 Přehled celého projektu | Všichni - začněte zde! |
| **QUICKSTART.md** | ⚡ Krok za krokem instalace | Začátečníci |
| **README.md** | 📚 Kompletní dokumentace + API reference | Vývojáři, pokročilí |
| **CHEATSHEET.md** | 📝 Rychlá reference, příkazy, tipy | Běžné používání |
| **ICON_README.md** | 🎨 Jak vytvořit ikonku | Při instalaci |
| **FILE_STRUCTURE.md** | 📋 Tento soubor - přehled projektu | Orientace v projektu |

## 🚀 Instalační skripty

| Soubor | Účel | Použití |
|--------|------|---------|
| **install.sh** | Automatická instalace všeho | `./install.sh` |
| **create-icon.sh** | Vytvoření PNG ikonky z SVG | `./create-icon.sh` |

## 🎨 Assets

| Soubor | Účel |
|--------|------|
| **icon-template.svg** | SVG šablona pro ikonku extension |
| **command-icon.png** | ⚠️ Vytvořit! PNG ikonka pro Raycast (512x512) |

## 📝 Příklady a šablony

| Soubor | Účel |
|--------|------|
| **example-workflow.json** | Ukázkový ComfyUI workflow pro testování |

## ⚙️ Konfigurace projektu

| Soubor | Účel |
|--------|------|
| **package.json** | NPM dependencies, skripty, metadata |
| **tsconfig.json** | TypeScript konfigurace |
| **.gitignore** | Git ignore pravidla |

## 💻 Zdrojový kód (src/)

### 🎯 Hlavní příkazy

| Soubor | Popis | Raycast příkaz |
|--------|-------|----------------|
| **src/index.tsx** | GUI pro zpracování obrázků | "Process Images" |
| **src/manage-workflows.tsx** | Správa workflow souborů | "Manage Workflows" |

### 🔧 Utility

| Soubor | Popis |
|--------|-------|
| **src/utils/comfyui.ts** | Kompletní ComfyUI API wrapper |

#### Funkce v comfyui.ts:

- `getWorkflows()` - Načte seznam workflow ze složky
- `analyzeWorkflow()` - Analyzuje workflow (má LoadImage? Prompt node?)
- `ensureServerRunning()` - Zajistí že server běží (+ HA integrace)
- `processImages()` - Hlavní funkce pro zpracování obrázků
- `uploadImage()` - Upload obrázku na server
- `setWorkflowImage()` - Nastaví obrázek do workflow
- `setWorkflowPrompt()` - Nastaví prompt do workflow
- `sendWorkflow()` - Odešle workflow k zpracování
- `waitForCompletion()` - Čeká na dokončení
- `downloadResults()` - Stáhne výsledky

## 🎬 Typický workflow použití

```
1. Uživatel otevře Raycast
2. Spustí "Process Images"
   └─> src/index.tsx
3. Vybere obrázky a workflow
4. Stiskne Enter
5. Extension volá:
   └─> ensureServerRunning()      [src/utils/comfyui.ts]
       ├─ Zkontroluje dostupnost serveru
       └─ Pokud ne, zapne přes Home Assistant
   └─> processImages()            [src/utils/comfyui.ts]
       ├─> uploadImage()          (pro každý obrázek)
       ├─> setWorkflowImage()     (nastav obrázek)
       ├─> setWorkflowPrompt()    (pokud je zadán prompt)
       ├─> sendWorkflow()         (odešli na server)
       ├─> waitForCompletion()    (počkej na výsledek)
       └─> downloadResults()      (stáhni zpracované)
6. Zobrazí úspěch + nabídne otevřít složku
```

## 📦 Po buildu (dist/)

Po spuštění `npm run build` se vytvoří:

```
dist/
├── index.js               # Kompilovaný hlavní příkaz (Process Images)
├── manage-workflows.js    # Kompilovaný správce workflows
└── utils/
    └── comfyui.js         # Kompilovaný API wrapper
```

## 🔄 Development workflow

```bash
# 1. První instalace
./install.sh

# 2. Vývoj
npm run dev              # Hot reload

# 3. Testování v Raycastu
# Import Extension → Vyberte složku

# 4. Úpravy kódu
# Editujte src/*.tsx
# Raycast automaticky reloadne

# 5. Production build
npm run build

# 6. Publish (volitelné)
npm run publish
```

## 🗂️ Struktura složek při použití

```
~/Documents/ComfyUI/
└── workflows/              # Sem dáte workflow soubory
    ├── portrait_enhance.json
    ├── landscape_upscale.json
    └── photo_to_sketch.json

~/Downloads/               # Nebo kdekoli jinde
└── photos/
    ├── photo1.jpg
    ├── photo1_edited.jpg  # Výstup po zpracování
    ├── photo2.jpg
    └── photo2_edited.jpg  # Výstup po zpracování
```

## 🔍 Kde hledat co

### Chci začít používat extension
→ **QUICKSTART.md**

### Mám problém
→ **CHEATSHEET.md** (sekce "Časté problémy")

### Chci upravit kód
→ **README.md** (API reference) + **src/**

### Chci porozumět workflow souborům
→ **README.md** (sekce "Struktura workflow")
→ **example-workflow.json**

### Chci změnit vzhled/chování
→ **src/process-images.tsx** (GUI)
→ **src/manage-workflows.tsx** (Správa)

### Chci přidat novou funkci do API
→ **src/utils/comfyui.ts**

### Instalace nefunguje
→ **QUICKSTART.md** (krok za krokem)
→ **CHEATSHEET.md** (troubleshooting)

## 📊 Statistiky projektu

- **Celkem souborů**: ~15
- **TypeScript kód**: 3 soubory
- **Dokumentace**: 6 souborů
- **Pomocné skripty**: 2 bash skripty
- **Příklady**: 1 workflow JSON
- **Assets**: 1 SVG šablona

## 🎯 Další kroky

Po prostudování této dokumentace:

1. ✅ Přečtěte **QUICKSTART.md** a nainstalujte
2. ✅ Vyzkoušejte s **example-workflow.json**
3. ✅ Vytvořte vlastní workflows
4. ✅ Prozkoumejte **CHEATSHEET.md** pro tipy
5. ✅ Pokud chcete upravovat kód, čtěte **README.md**

---

Příjemné zpracovávání obrázků! 🎨✨
