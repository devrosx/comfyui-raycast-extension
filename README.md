# ComfyUI Image Processor pro Raycast

Raycast extension pro zpracování obrázků přes ComfyUI s podporou vlastních workflow a promptů.

## Funkce

- 🖼️ **Dávkové zpracování** - Zpracujte více obrázků najednou
- 🔄 **Custom workflows** - Použijte vlastní ComfyUI workflows
- ✍️ **Vlastní prompty** - Upravte prompty přímo z Raycastu
- 💾 **Historie promptů** - Rychlý přístup k nedávno použitým promptům
- 🏠 **Home Assistant integrace** - Automatické zapnutí serveru
- 📁 **Správa workflows** - Přehled, úprava a mazání workflows

## Instalace

### 1. Předpoklady

- [Raycast](https://raycast.com/) nainstalovaný
- [Node.js](https://nodejs.org/) (verze 18 nebo novější)
- Běžící ComfyUI server

### 2. Instalace extension

```bash
# Přejděte do složky s extension
cd comfyui-image-processor

# Nainstalujte závislosti
npm install

# Buildněte extension
npm run build

# Nebo spusťte v dev módu
npm run dev
```

### 3. Import do Raycastu

1. Otevřete Raycast
2. Napište "Import Extension"
3. Vyberte složku s touto extensionem
4. Extension se automaticky přidá

## Konfigurace

Po instalaci nastavte v Raycast Preferences:

### Povinné nastavení

- **ComfyUI Server URL**: URL adresa vašeho ComfyUI serveru
  - Příklad: `http://192.168.3.88:5000`
- **Output Suffix**: Přípona pro výstupní soubory
  - Výchozí: `_edited`
- **Workflows Path**: Cesta ke složce s workflow soubory
  - Příklad: `~/Documents/ComfyUI/workflows`

### Volitelné nastavení (Home Assistant)

Pokud chcete automatické zapínání serveru přes Home Assistant:

- **Home Assistant URL (Internal)**: Interní URL vašeho HA
- **Home Assistant URL (External)**: Externí URL vašeho HA
- **Home Assistant Token**: Autorizační token z HA
- **ComfyUI Switch Entity**: Entity ID přepínače (např. `switch.comfyui`)

## Použití

### Zpracování obrázků

1. Otevřete Raycast a napište "Process Images"
2. Vyberte jeden nebo více obrázků
3. Vyberte workflow ze seznamu
4. (Volitelně) Zaškrtněte "Použít vlastní prompt" a zadejte prompt
5. Stiskněte Enter pro zpracování

### Správa workflows

1. Otevřete Raycast a napište "Manage Workflows"
2. Zobrazí se seznam všech dostupných workflows s:
   - Velikostí souboru
   - Datem poslední úpravy
   - Indikátory LoadImage a Prompt nodů

**Dostupné akce:**
- **Enter**: Otevřít workflow
- **Cmd+O**: Otevřít v Finderu
- **Cmd+C**: Kopírovat cestu
- **Cmd+D**: Duplikovat workflow
- **Cmd+Delete**: Smazat workflow
- **Cmd+R**: Obnovit seznam
- **Cmd+Shift+O**: Otevřít složku s workflows

## Struktura workflow souborů

Extension očekává JSON soubory s ComfyUI workflow v následující struktuře:

```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": {
      "image": "placeholder.png"
    }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "your prompt here"
    },
    "_meta": {
      "title": "Positive Prompt"
    }
  }
}
```

### Podporované node typy

**Pro načítání obrázků:**
- `LoadImage`

**Pro prompty:**
- `PrimitiveStringMultiline`
- `CLIPTextEncode`
- `ImpactWildcardProcessor`

## Tipy

1. **Rychlý přístup**: Nastavte si keyboard shortcut pro "Process Images"
2. **Organize workflows**: Používejte popisné názvy pro workflow soubory
3. **Test workflows**: Vyzkoušejte workflow v ComfyUI před použitím v Raycastu
4. **Historie promptů**: Raycast si pamatuje posledních 10 použitých promptů

## Troubleshooting

### Server není dostupný
- Zkontrolujte, že ComfyUI běží na správné adrese
- Ověřte firewall nastavení
- Pokud používáte HA integraci, zkontrolujte token a entity ID

### Workflow nefunguje
- Ujistěte se, že workflow obsahuje `LoadImage` node
- Zkontrolujte, že JSON je validní
- Otevřete workflow v "Manage Workflows" pro kontrolu

### Prompty se neuplatňují
- Workflow musí obsahovat podporovaný prompt node
- Zkontrolujte `_meta.title` u nodů (měl by obsahovat "prompt" nebo "positive")

## Original Python Script

Tato extension je založená na Python skriptu `multiimage_edit.py`. Pokud preferujete příkazovou řádku:

```bash
python3 multiimage_edit.py workflow.json image1.jpg image2.jpg -prompt "portrait photo"
```

## Podpora

Pokud narazíte na problém:
1. Zkontrolujte Raycast logy (Cmd+Shift+L)
2. Ověřte konzoli v Developer Tools
3. Otevřete issue na GitHubu

## License

MIT
