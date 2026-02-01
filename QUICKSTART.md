# 🚀 Rychlý start - ComfyUI Image Processor

## Krok za krokem instalace

### 1. Připravte prostředí

```bash
# Naklonujte nebo stáhněte tento projekt
cd comfyui-image-processor

# Nainstalujte závislosti
npm install
```

### 2. Vytvořte ikonku

Vytvořte soubor `command-icon.png` (512x512 px) v root složce projektu.
Tip: Použijte SF Symbol nebo jakýkoliv PNG obrázek.

### 3. Vytvořte složku pro workflows

```bash
# Vytvořte složku pro workflow soubory
mkdir -p ~/Documents/ComfyUI/workflows

# Zkopírujte sem vaše .json workflow soubory z ComfyUI
```

### 4. Nastavte ComfyUI server

Ujistěte se, že váš ComfyUI server běží a je dostupný.

Testovací příkaz:
```bash
curl http://192.168.3.88:5000/system_stats
```

### 5. Buildněte extension

```bash
# Development mód (hot reload)
npm run dev

# Nebo production build
npm run build
```

### 6. Importujte do Raycastu

1. Otevřete Raycast (Cmd+Space)
2. Napište: "Import Extension"
3. Vyberte složku s tímto projektem
4. Klikněte "Import"

### 7. Nastavte preferences

V Raycast:
1. Otevřete Settings (Cmd+,)
2. Najděte "ComfyUI Image Processor"
3. Nastavte:
   - **Server URL**: např. `http://192.168.3.88:5000`
   - **Workflows Path**: např. `~/Documents/ComfyUI/workflows`
   - **Output Suffix**: např. `_edited`

### 8. První použití

1. Stiskněte Cmd+Space (Raycast)
2. Napište: "Process Images"
3. Vyberte testovací obrázek
4. Vyberte workflow
5. Stiskněte Enter

## 🎯 Příklad workflow souboru

Vytvořte soubor `~/Documents/ComfyUI/workflows/test_workflow.json`:

```json
{
  "3": {
    "inputs": {
      "image": "placeholder.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "6": {
    "inputs": {
      "text": "beautiful portrait photo, professional",
      "clip": ["11", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Positive Prompt"
    }
  },
  "7": {
    "inputs": {
      "text": "ugly, blurry, low quality",
      "clip": ["11", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Negative Prompt"
    }
  },
  "11": {
    "inputs": {
      "ckpt_name": "sd_xl_base_1.0.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  }
}
```

## 🔧 Řešení problémů

### Extension se neimportuje
- Zkontrolujte, že máte `command-icon.png` v root složce
- Spusťte `npm run build` před importem
- Restartujte Raycast

### Server se nespustí
- Ověřte URL v preferences
- Zkontrolujte že ComfyUI běží
- Zkuste ping serveru: `ping 192.168.3.88`

### Workflow nefunguje
- Otevřete workflow v ComfyUI a exportujte jako API format
- Ujistěte se že obsahuje LoadImage node
- Zkontrolujte JSON syntax

## 📝 Další kroky

1. **Nastavte keyboard shortcut**:
   - Settings → Extensions → ComfyUI Image Processor
   - Přiřaďte např. Cmd+Shift+I

2. **Vytvořte vlastní workflows**:
   - Exportujte z ComfyUI (Save as API Format)
   - Uložte do workflows složky
   - Pojmenujte popisně (např. `portrait_enhance.json`)

3. **Používejte prompty**:
   - Zaškrtněte "Použít vlastní prompt"
   - Extension si pamatuje historii
   - Můžete rychle měnit styl bez úpravy workflow

## 🎉 Hotovo!

Nyní můžete zpracovávat obrázky přímo z Raycastu!

Tipy:
- Používejte drag & drop pro rychlý výběr obrázků
- Kombinujte s File Actions v Raycastu
- Vytvořte si vlastní kolekci workflows pro různé účely
