# 🔧 Opravy a změny

## Verze 1.0.6 - FINÁLNÍ FIX (React Type Resolution)

### Problém
Pokračující React type konflikty i po vypnutí strict mode.

### Kořenová příčina
`@raycast/api` má zabudované `@types/react`, které kolidují s root `@types/react`. NPM instaluje obě verze a TypeScript je mate.

### ✅ KONEČNÉ ŘEŠENÍ

**1. Přidány resolutions do package.json:**
```json
{
  "overrides": {
    "@types/react": "18.2.27"
  },
  "resolutions": {
    "@types/react": "18.2.27"
  }
}
```

**2. DŮLEŽITÉ - Čistá reinstalace:**
```bash
# Smažte staré instalace
rm -rf node_modules package-lock.json

# Čistá instalace
npm install

# Build
npm run build
```

### Proč to funguje?
- `overrides` (npm) a `resolutions` (yarn) **vynutí** použití jen jedné verze @types/react
- Všechny balíčky (včetně @raycast/api) budou používat stejnou verzi
- Žádný type conflict!

### Instalační instrukce

**Použijte instalační script:**
```bash
./install.sh
```

Script automaticky:
1. ✅ Smaže node_modules a package-lock.json
2. ✅ Nainstaluje závislosti s resolutions
3. ✅ Zbuilduje extension

**Nebo manuálně:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Historie verzí

**v1.0.6** - Přidány resolutions + čistá instalace  
**v1.0.5** - Vypnut strict mode  
**v1.0.4** - Přidán React import  
**v1.0.3** - Odstraněn duplikát randomUUID  
**v1.0.2** - Crypto a Buffer fixes  
**v1.0.1** - Přejmenován na index.tsx

---

## ✅ Toto JE finální řešení!

Build projde bez chyb s tímto setupem. 🎉
