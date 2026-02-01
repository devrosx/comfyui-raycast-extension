# 📝 ComfyUI Image Processor - Cheat Sheet

## Rychlé příkazy

### Instalace
```bash
./install.sh                 # Automatická instalace
npm install                  # Manuální instalace závislostí
npm run build                # Build pro production
npm run dev                  # Development mód (hot reload)
```

### Vytvoření ikonky
```bash
./create-icon.sh             # Automatická konverze SVG → PNG

# Nebo manuálně:
convert -background none -resize 512x512 icon-template.svg command-icon.png
rsvg-convert -w 512 -h 512 icon-template.svg -o command-icon.png
```

### Raycast příkazy

Po importu do Raycastu:

- `Process Images` - Zpracování obrázků
- `Manage Workflows` - Správa workflow souborů

### Klávesové zkratky v Raycastu

#### Process Images
- `Enter` - Spustit zpracování
- `Cmd+R` - Obnovit seznam workflows

#### Manage Workflows
- `Enter` - Otevřít workflow
- `Cmd+O` - Otevřít v Finderu
- `Cmd+C` - Kopírovat cestu
- `Cmd+D` - Duplikovat workflow
- `Cmd+Delete` - Smazat workflow
- `Cmd+R` - Obnovit seznam
- `Cmd+Shift+O` - Otevřít složku s workflows

## Struktura projektu

```
comfyui-image-processor/
├── src/
│   ├── index.tsx               # Hlavní příkaz pro zpracování
│   ├── manage-workflows.tsx    # Správa workflow
│   └── utils/
│       └── comfyui.ts          # ComfyUI API funkce
├── package.json                # NPM konfigurace
├── tsconfig.json               # TypeScript konfigurace
├── command-icon.png            # Ikonka (vytvořit)
├── install.sh                  # Instalační script
├── create-icon.sh              # Helper pro vytvoření ikonky
├── icon-template.svg           # SVG šablona pro ikonku
├── example-workflow.json       # Příklad workflow
├── README.md                   # Kompletní dokumentace
├── QUICKSTART.md               # Rychlý start
└── ICON_README.md              # Info o ikonce
```

## Konfigurace (Raycast Preferences)

### Povinné
- `serverUrl`: `http://192.168.3.88:5000`
- `workflowsPath`: `~/Documents/ComfyUI/workflows`
- `outputSuffix`: `_edited`

### Volitelné (Home Assistant)
- `haUrlInternal`: `http://192.168.3.114:8188`
- `haUrlExternal`: `http://188.75.144.234:8188`
- `haToken`: (váš token)
- `comfyuiSwitch`: `switch.comfyui`

## Workflow soubor (JSON)

Minimální struktura:
```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "placeholder.png" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "prompt here" },
    "_meta": { "title": "Positive Prompt" }
  }
}
```

### Podporované node typy

**LoadImage:**
- `LoadImage` - Pro načtení obrázku

**Prompt nody:**
- `PrimitiveStringMultiline` (field: `value`)
- `CLIPTextEncode` (field: `text`)
- `ImpactWildcardProcessor` (field: `wildcard_text`)

## Časté problémy

### Extension se neimportuje
✓ Zkontrolujte `command-icon.png` (musí existovat)
✓ Spusťte `npm run build`
✓ Restartujte Raycast

### Server není dostupný
✓ Ověřte že ComfyUI běží
✓ Zkontrolujte URL v preferences
✓ Test: `curl http://192.168.3.88:5000/system_stats`

### Workflow nefunguje
✓ Musí obsahovat LoadImage node
✓ Exportujte z ComfyUI jako "API Format"
✓ Ověřte JSON syntax

### Prompt se neaplikuje
✓ Workflow musí obsahovat prompt node
✓ Node musí mít správný `_meta.title` (např. "Positive Prompt")
✓ Zkontrolujte field name (text/value/wildcard_text)

## Python verze (původní script)

```bash
# Základní použití
python3 multiimage_edit.py workflow.json image.jpg

# S vlastním promptem
python3 multiimage_edit.py workflow.json image.jpg -prompt "portrait photo"

# Více obrázků
python3 multiimage_edit.py workflow.json img1.jpg img2.jpg img3.jpg

# Celá složka
python3 multiimage_edit.py workflow.json ./images/
```

## Užitečné odkazy

- [Raycast Docs](https://developers.raycast.com/)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- [Node.js Download](https://nodejs.org/)
- [Online SVG→PNG](https://cloudconvert.com/svg-to-png)

## Tips & Tricks

1. **Rychlý výběr obrázků**: Použijte Raycast File Actions (vyberte soubory v Finderu → Raycast → Process Images)

2. **Vlastní keyboard shortcut**: Settings → Extensions → ComfyUI → Přiřaďte např. Cmd+Shift+I

3. **Historie promptů**: Extension si pamatuje posledních 10 promptů

4. **Batch processing**: Vyberte více obrázků najednou (Cmd+Click v file pickeru)

5. **Workflow organizace**: Používejte popisné názvy:
   - `portrait_enhance.json`
   - `landscape_upscale.json`
   - `photo_to_sketch.json`

6. **Custom výstupní složka**: Upravte workflow a změňte SaveImage node path

7. **Debug**: Raycast logy viz Cmd+Shift+L
