# 🎉 Nové Features - Verze 2.0

## ✨ Co je nového?

### 1. **Volitelné obrázky při použití custom promptu** 🎨
Nyní můžete zpracovat pouze prompt bez vstupních obrázků!

**Jak použít:**
- Otevřete `ComfyUI Convert`
- Zaškrtněte "Použít vlastní prompt"
- Zadejte prompt
- Můžete vynechat výběr obrázků
- **Automaticky se zobrazí výběr výstupní složky**
- Workflow vygeneruje obrázky jen z promptu

### 2. **Automatický výběr výstupní složky** 📁
Když nevyberete vstupní obrázky, automaticky se zobrazí pole pro výběr výstupní složky!

**Chování:**
- ✅ **S obrázky**: Výstupy se uloží vedle originálů (jako dřív)
- ✅ **Bez obrázků**: Musíte vybrat kam uložit výsledky

### 3. **Finder Integration** 📂
Zpracujte obrázky přímo z Finderu!

**Jak použít:**
1. Vyberte obrázky v Finderu
2. Klikněte pravým tlačítkem
3. Raycast → "Convert with ComfyUI"
4. Vyberte workflow
5. Hotovo!

### 4. **Přejmenováno "Process Images" → "ComfyUI Convert"** ✏️
Kratší a jasnější název pro hlavní příkaz.

### 5. **Anglická dokumentace** 🌍
Nové soubory:
- `README_EN.md` - Kompletní anglická dokumentace
- `QUICKSTART_EN.md` - Anglický quick start guide

---

## 📋 Všechny příkazy

### ComfyUI Convert
**Hlavní příkaz pro zpracování**
- Vyberte obrázky (volitelné s custom promptem)
- Vyberte workflow
- Zadejte prompt (volitelně)
- Zpracujte!

### Convert with ComfyUI
**Finder akce**
- Funguje s vybraným souborem/soubory
- Rychlé zpracování z kontextového menu
- Žádné zbytečné kroky

### Manage Workflows
**Správa workflow souborů**
- Prohlížení všech workflows
- Duplikace, mazání
- Rychlý přehled metadat

---

## 🚀 Jak začít s novými features

### Zpracování jen s promptem (bez obrázků)

```
1. Raycast → "ComfyUI Convert"
2. NEVYBÍREJTE obrázky
3. ✓ Zaškrtněte "Použít vlastní prompt"
4. Zadejte: "beautiful sunset over mountains"
5. Vyberte workflow který nepoužívá LoadImage
6. Enter
```

### Zpracování z Finderu

```
1. Najděte obrázky v Finderu
2. Vyberte jeden nebo více
3. Pravé tlačítko → Raycast
4. "Convert with ComfyUI"
5. Vyberte workflow
6. Enter
```

---

## 🔧 Technické změny

### Kód
- ✅ `src/index.tsx` - volitelné obrázky
- ✅ `src/convert-from-finder.tsx` - nový Finder action
- ✅ `package.json` - nový příkaz "convert-from-finder"
- ✅ Lepší error handling

### Dokumentace
- ✅ `README_EN.md` - anglická verze README
- ✅ `QUICKSTART_EN.md` - anglický quick start
- ✅ Aktualizováno INDEX.md, README.md

---

## 📦 Instalace

```bash
# Rozbalte nový ZIP
unzip comfyui-raycast-extension.zip -d comfyui-raycast-extension
cd comfyui-raycast-extension

# DŮLEŽITÉ: Čistá reinstalace pro nové features
rm -rf node_modules package-lock.json
npm install
npm run build

# Import do Raycastu
# Raycast → Import Extension → Vyberte složku
```

---

## 🎯 Příklady použití

### Use Case 1: Text-to-Image (bez obrázků)
**Jen prompt, žádné vstupní obrázky**
```
ComfyUI Convert
→ NEVYBÍREJTE obrázky
→ Automaticky se zobrazí "Výstupní složka"
→ Vyberte: ~/Pictures/AI_Generated
→ Custom prompt: "cyberpunk cityscape at night"
→ Workflow: text2img.json
→ Výstupy se uloží do ~/Pictures/AI_Generated
```

### Use Case 2: Batch Processing z Finderu
**Zpracování více fotek najednou**
```
Finder: Vybrat 10 fotek
→ Pravé tlačítko → Raycast
→ Convert with ComfyUI
→ Workflow: portrait_enhance.json
```

### Use Case 3: Image-to-Image s promptem
**Kombinace obrázku a promptu**
```
ComfyUI Convert
→ Vybrat obrázek
→ Custom prompt: "make it look like oil painting"
→ Workflow: img2img.json
```

---

## 💡 Tipy

1. **Vytvořte různé workflows pro různé účely:**
   - `text2img.json` - generování z promptu
   - `img2img.json` - úprava existujících obrázků
   - `upscale.json` - zvětšování
   - `style_transfer.json` - přenos stylu

2. **Použijte Finder integraci pro rychlé zpracování:**
   - Vyberte fotky v Photoshopu/Lightroom složce
   - Pravé tlačítko → Raycast
   - Jeden klik pro batch processing

3. **Historie promptů:**
   - Extension si pamatuje posledních 10 promptů
   - Rychlý výběr z dropdownu
   - Žádné opakované psaní

---

**Verze: 2.0**  
**Datum: 2026-02-01**
