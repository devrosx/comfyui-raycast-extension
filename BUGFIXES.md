# 🔧 Opravy - Verze 2.1

## ✅ Co bylo opraveno:

### 1. **Ukládání souborů z text2img workflow** 
**Problém:** Když jste použili jen prompt (bez vstupních obrázků), ComfyUI vygeneroval soubory jako `z-image_00002_.png`, ale skript je neuložil.

**Řešení:**
- ✅ Skript nyní zachovává původní název z ComfyUI
- ✅ Soubory se uloží do vybrané výstupní složky s jejich originálním názvem
- ✅ Funguje i pro více vygenerovaných obrázků

### 2. **Finder Integration** 
**Problém:** Pravý klik na soubory ve Finderu nefungoval - akce se nezobrazovala.

**Řešení:**
- ✅ Přidána podpora pro `getSelectedFinderItems()` API
- ✅ Extension nyní správně detekuje vybrané soubory z Finderu
- ✅ Funguje stejně jako "Convert Images" extension

---

## 🎯 Jak nyní funguje:

### Text2Image (bez vstupních obrázků):
```
1. ComfyUI Convert
2. Nevyberete obrázky
3. Vyberete výstupní složku: ~/Pictures/AI_Generated
4. Zadáte prompt: "sunset over ocean"
5. ComfyUI vygeneruje: z-image_00001_.png, z-image_00002_.png
6. ✅ Soubory se uloží jako:
   ~/Pictures/AI_Generated/z-image_00001_.png
   ~/Pictures/AI_Generated/z-image_00002_.png
```

### Image2Image (s vstupními obrázky):
```
1. Vyberete: photo.jpg
2. ComfyUI zpracuje
3. ✅ Uloží jako: photo_edited.jpg (vedle originálu)
```

### Finder Action:
```
1. Vyberte obrázky ve Finderu (Cmd+Click pro více)
2. Pravý klik → Raycast
3. Měli byste vidět: "Convert with ComfyUI"
4. Klikněte → vyberte workflow
5. ✅ Zpracuje všechny vybrané soubory
```

---

## 📦 Instalace opravy:

```bash
# Přejděte do složky s extension
cd ~/Desktop/comfyui-raycast-extension  # nebo kde ji máte

# Rozbalte nový ZIP (přepíše staré soubory)
unzip -o ~/Downloads/comfyui-raycast-extension.zip

# Čistá reinstalace
rm -rf node_modules package-lock.json
npm install
npm run build
```

Raycast automaticky reloadne extension!

---

## 🔍 Ověření že opravy fungují:

### Test 1: Text2Image
```
1. ComfyUI Convert
2. Nevyberte obrázky
3. Vyberte výstupní složku
4. Zadejte prompt
5. Zkontrolujte že se soubory uložily s originálními názvy
```

### Test 2: Finder Action
```
1. Otevřete Finder
2. Vyberte 2-3 obrázky
3. Pravý klik
4. Měli byste vidět Raycast sekci
5. Klikněte "Convert with ComfyUI"
6. Mělo by fungovat!
```

---

## 💡 Pokud Finder action stále nefunguje:

1. **Restartujte Raycast:**
   ```
   Cmd+Q (Quit Raycast)
   Znovu otevřete
   ```

2. **Překontrolujte extension:**
   ```
   Raycast → Manage Extensions
   Najděte "ComfyUI Image Processor"
   Měla by být enabled
   ```

3. **Zkontrolujte permissions:**
   ```
   System Preferences → Privacy & Security
   Files and Folders → Raycast
   Ujistěte se že má přístup
   ```

---

**Verze: 2.1**  
**Datum: 2026-02-01**  
**Změny: Bug fixes pro ukládání souborů a Finder integration**
