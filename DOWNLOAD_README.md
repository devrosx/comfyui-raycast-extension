# 📥 Instalace ComfyUI Image Processor

## Stažení a rozbalení

1. **Stáhněte ZIP soubor**: `comfyui-raycast-extension.zip`

2. **Rozbalte archiv**:
   ```bash
   # V terminálu (nebo použijte Finder - dvojklik)
   unzip comfyui-raycast-extension.zip -d comfyui-raycast-extension
   cd comfyui-raycast-extension
   ```

3. **Spusťte instalaci**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

4. **Import do Raycastu**:
   - Otevřete Raycast (Cmd+Space)
   - Napište: `Import Extension`
   - Vyberte složku `comfyui-raycast-extension`

5. **Nastavte preferences** v Raycastu:
   - Server URL: `http://192.168.3.88:5000`
   - Workflows Path: `~/Documents/ComfyUI/workflows`
   - Output Suffix: `_edited`

## Obsah ZIPu

```
comfyui-raycast-extension.zip
├── src/                        # Zdrojové soubory
│   ├── index.tsx              # Hlavní příkaz
│   ├── manage-workflows.tsx   # Správa workflows
│   └── utils/
│       └── comfyui.ts         # API wrapper
├── package.json               # NPM konfigurace
├── tsconfig.json              # TypeScript config
├── install.sh                 # Instalační script
├── create-icon.sh             # Helper pro ikonku
├── icon-template.svg          # SVG šablona
├── example-workflow.json      # Ukázkový workflow
├── .gitignore                 # Git ignore
└── Dokumentace:
    ├── INDEX.md              # Přehled projektu
    ├── QUICKSTART.md         # Rychlý start
    ├── README.md             # Kompletní dokumentace
    ├── CHEATSHEET.md         # Rychlá reference
    ├── FILE_STRUCTURE.md     # Struktura souborů
    ├── ICON_README.md        # Info o ikonce
    └── FIXES.md              # Poznámky o opravách
```

## ⚠️ Důležité

Před prvním použitím:

1. ✅ Vytvořte složku pro workflows: `mkdir -p ~/Documents/ComfyUI/workflows`
2. ✅ Zkopírujte sem své ComfyUI workflow .json soubory
3. ✅ Ujistěte se, že ComfyUI server běží
4. ✅ Vytvořte ikonku (automaticky přes `install.sh` nebo manuálně)

## 🚀 Rychlý test

Po instalaci:

```bash
# 1. Zkontrolujte že server běží
curl http://192.168.3.88:5000/system_stats

# 2. Otevřete Raycast
# Cmd+Space

# 3. Napište
Process Images

# 4. Vyberte testovací obrázek a workflow
```

## 📚 Další dokumentace

- **První kroky**: Otevřete `QUICKSTART.md`
- **Kompletní návod**: Otevřete `README.md`
- **Rychlá reference**: Otevřete `CHEATSHEET.md`

## 🆘 Pomoc

Pokud něco nefunguje:

1. Zkontrolujte `FIXES.md` pro známé problémy
2. Přečtěte sekci "Troubleshooting" v `CHEATSHEET.md`
3. Spusťte `./install.sh` znovu

---

**Šťastné zpracovávání obrázků! 🎨**
