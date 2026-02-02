# 🔧 Bugfixes - Version 2.4.1

## ✅ Fixed Issues:

### 1. **Screenshot Command Not Working** 🐛
**Problem:**
- "Select area to capture" appeared
- Nothing could be selected
- "Screenshot failed" error

**Root Cause:**
- Wrong `screencapture` parameters
- Used `-s` flag which is invalid
- Temp folder (`/tmp`) permissions issue

**Fix:**
```typescript
// OLD (broken):
await execAsync(`screencapture -i -s "${screenshotPath}"`);

// NEW (working):
await execAsync(`screencapture -i -x "${screenshotPath}"`);
```

**Changes:**
- ✅ Removed invalid `-s` flag
- ✅ Added `-x` (no sound) instead
- ✅ Changed save location to `~/Downloads` (more reliable)
- ✅ Added proper wait time after closeMainWindow (300ms)
- ✅ Better error handling for user cancellation

### 2. **File Overwriting Issue** 🐛
**Problem:**
- When processing same image multiple times
- `photo_edited.png` would overwrite previous `photo_edited.png`
- Lost previous results

**Fix:**
Added automatic numbering:
```
photo.jpg → photo_edited.png
photo.jpg → photo_edited_1.png  (if _edited exists)
photo.jpg → photo_edited_2.png  (if _edited_1 exists)
photo.jpg → photo_edited_3.png  (etc.)
```

**Implementation:**
```typescript
function getUniqueFilename(basePath: string, suffix: string, extension: string): string {
  let counter = 1;
  let testPath = `${basePath}${suffix}${extension}`;
  
  while (existsSync(testPath)) {
    testPath = `${basePath}${suffix}_${counter}${extension}`;
    counter++;
  }
  
  return testPath;
}
```

---

## 🎯 How Screenshot Works Now:

### Step-by-Step:
```
1. Run "Screenshot to ComfyUI"
2. Raycast window closes
3. Wait 300ms for window to fully close
4. Show HUD: "Select area to capture"
5. User selects area with mouse (drag rectangle)
6. OR user presses ESC to cancel
7. If cancelled → Show "Screenshot cancelled", exit
8. If captured → Save to ~/Downloads/ComfyUI_Screenshot_[timestamp].png
9. Store path in LocalStorage
10. Show "✓ Screenshot captured! Opening ComfyUI Convert..."
11. Wait 600ms
12. Launch ComfyUI Convert
13. ComfyUI Convert loads screenshot automatically
```

### Cancel Behavior:
- Press **ESC** during selection → Clean exit, no errors
- Close window during selection → Same as ESC
- No annoying error messages!

---

## 🎯 How File Numbering Works:

### Example Scenario:
```bash
# First processing
photo.jpg → ComfyUI → photo_edited.png

# Second processing (same photo)
photo.jpg → ComfyUI → photo_edited_1.png  ✅

# Third processing
photo.jpg → ComfyUI → photo_edited_2.png  ✅

# All versions preserved!
$ ls
photo.jpg
photo_edited.png
photo_edited_1.png
photo_edited_2.png
```

### Works with any extension:
```
image.png → image_edited.png, image_edited_1.png, ...
photo.jpg → photo_edited.webp, photo_edited_1.webp, ...
```

---

## 🚀 Installation:

```bash
cd ~/Desktop/comfyui-raycast-extension
unzip -o ~/Downloads/comfyui-raycast-extension.zip
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🧪 Test Screenshot:

```
1. Open Raycast (Cmd+Space)
2. Type "Screenshot to ComfyUI"
3. Press Enter
4. You should see cursor change to crosshair
5. Click and drag to select area
6. Release mouse
7. ComfyUI Convert should open with "Screenshot ready to process"
```

If you still get errors, check:
- macOS permissions (System Preferences → Privacy → Screen Recording → Raycast)
- Downloads folder exists and is writable

---

**Version: 2.4.1**  
**Date: 2026-02-02**  
**Fixes: Screenshot command + File overwrite protection**
