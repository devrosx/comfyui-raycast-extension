# Test Coverage Analysis

## Current State: 0% Coverage

The codebase has **zero automated tests** — no test files, no testing framework, and no test configuration. There are ~1,569 lines of source code across 4 files.

## File Breakdown

| File | Lines | Testability | Priority |
|---|---|---|---|
| `src/utils/comfyui.ts` | 661 | **High** — pure logic, many extractable functions | **P0** |
| `src/index.tsx` | 606 | Medium — UI-heavy but contains testable logic | P1 |
| `src/manage-workflows.tsx` | 226 | Medium — utility functions are testable | P2 |
| `src/screenshot.tsx` | 76 | Low — mostly OS/Raycast API calls | P3 |

---

## P0: `src/utils/comfyui.ts` — Highest Value, Lowest Effort

### 1. `analyzeWorkflow()` (lines 48–77)

Parses workflow JSON and detects `LoadImage`/`LoadImages` and prompt nodes.

**Test cases:**
- Workflow with a `LoadImage` node → `hasLoadImage: true`
- Workflow with a `LoadImages` node → `hasLoadImage: true`
- Workflow with `CLIPTextEncode` → `hasPromptNode: true`
- Workflow with `PrimitiveStringMultiline` → `hasPromptNode: true`
- Workflow with `ImpactWildcardProcessor` → `hasPromptNode: true`
- Workflow with neither node type → both `false`
- Workflow with both node types → both `true`
- Malformed/empty JSON → `{false, false}` (no throw)
- Missing file → `{false, false}` (no throw)

### 2. `extractWorkflowParameters()` (lines 97–192)

Complex parameter extraction with many conditional branches.

**Test cases:**
- Extracts `LoadImage` nodes with correct `nodeId`, `title`, `inputKey`
- Differentiates `LoadImage` (key=`"image"`) vs `LoadImages` (key=`"images"`)
- Falls back to generic title when `_meta.title` is missing
- Extracts positive prompt from `title.includes("positive")` or `title.includes("prompt")`
- Extracts negative prompt from `title.includes("negative")`
- First unlabeled prompt node defaults to positive
- Extracts `batchSize`, `width`, `height` from node inputs
- Extracts model info: `ckpt_name`, `clip_name`, `vae_name`, `lora_name`, `unet_name`, `model_name`
- Extracts `sampler_name` and appends `scheduler` to mode string
- Returns `{}` on malformed input

### 3. `updateWorkflowParameters()` (lines 385–441)

Pure function — no I/O.

**Test cases:**
- Updates positive prompt on `CLIPTextEncode` nodes with matching title
- Updates negative prompt on nodes with `"negative"` in title
- Updates prompt on `PrimitiveStringMultiline` (uses `value` field)
- Updates prompt on `ImpactWildcardProcessor` (uses `wildcard_text` field)
- Updates `batch_size` only on nodes that already have it
- Updates `width`/`height` only on nodes that already have them
- Handles undefined/partial params (only updates what's provided)

### 4. `setWorkflowImage()` (lines 305–320)

Pure function.

**Test cases:**
- Sets image on the first `LoadImage` node found
- Uses correct input key (`"image"` vs `"images"`) for `LoadImage` vs `LoadImages`
- Creates `inputs` object if missing
- Only modifies the first matching node
- Returns workflow unchanged if no LoadImage nodes exist

### 5. `setWorkflowImages()` (lines 323–338)

Pure function.

**Test cases:**
- Sets images on specific nodes by ID
- Handles multiple node IDs
- Skips nodes that don't exist in the workflow
- Skips non-LoadImage nodes
- Creates `inputs` if missing

### 6. `setWorkflowPrompt()` (lines 340–383)

Pure function with complex branching.

**Test cases:**
- Sets prompt on `PrimitiveStringMultiline` with matching title keyword
- Sets prompt on `CLIPTextEncode` with matching title, but NOT if title includes `"negative"`
- Sets prompt on `ImpactWildcardProcessor` with matching title
- Falls back to `CLIPTextEncode` with `text` input even without keyword match
- Falls back to `PrimitiveStringMultiline` with `value` input even without keyword match
- Only modifies the first matching node

### 7. `getUniqueFilename()` (lines 10–20)

Pure function (mock `existsSync`).

**Test cases:**
- Returns base path when no conflict exists
- Appends `_1`, `_2`, etc. when files already exist
- Correctly concatenates `basePath`, `suffix`, and `extension`

### 8. `downloadResults()` path generation logic (lines 487–537)

**Test cases for path building:**
- img2img: derives output path from original file path with suffix
- txt2img: uses ComfyUI's original filename
- Handles file extension from ComfyUI filename
- `getUniqueFilename` integration to avoid overwriting

---

## P1: `src/index.tsx` — Extractable Business Logic

### 9. `savePromptToHistory()` (lines 95–108)

Can be extracted into a testable utility.

**Test cases:**
- Adds new prompt to front of the list
- Skips empty/whitespace-only prompts
- Skips duplicate prompts
- Caps history at 20 items

### 10. `handleSubmit()` validation logic (lines 222–376)

The validation branches are testable if extracted.

**Test cases:**
- Rejects submission with no images AND no prompt when LoadImage nodes exist
- Rejects submission with no workflow selected
- Rejects text2img submission with no output folder
- Correctly builds `imagesToProcess` from screenshot, Finder files, or form fields
- Handles single vs multiple LoadImage node mapping

---

## P2: `src/manage-workflows.tsx` — Utility Functions

### 11. `formatFileSize()` (lines 146–151)

Pure function.

**Test cases:**
- Returns `"?"` for undefined/0
- Formats bytes (`"512 B"`), KB (`"1.5 KB"`), MB (`"2.3 MB"`) correctly
- Rounds to 1 decimal place

### 12. `formatDate()` (lines 153–156)

Pure function.

**Test cases:**
- Returns `"?"` for undefined
- Formats date in `cs-CZ` locale

---

## Recommended Testing Setup

**Framework:** [Vitest](https://vitest.dev/) — fast, TypeScript-native, ESM-compatible (this project uses ESM `node-fetch`).

**Directory structure:**
```
src/
  utils/
    comfyui.ts
    __tests__/
      comfyui.test.ts            # P0 — all utility function tests
      workflow-fixtures/          # sample workflow JSON files
        basic-img2img.json
        basic-txt2img.json
        multi-loadimage.json
        prompt-nodes.json
  __tests__/
    helpers.test.ts              # P1/P2 — extracted helper tests
```

**What to mock:**
- `fs/promises` and `fs` for file I/O in `getWorkflows`, `analyzeWorkflow`, `extractWorkflowParameters`
- `node-fetch` for network calls in `uploadImage`, `sendWorkflow`, `waitForCompletion`, `checkServerAvailability`
- `@raycast/api` for `showToast` in `ensureServerRunning`
- `existsSync` for `getUniqueFilename`

**What NOT to mock (test directly with real data):**
- `setWorkflowImage`
- `setWorkflowImages`
- `setWorkflowPrompt`
- `updateWorkflowParameters`
- `formatFileSize`
- `formatDate`

---

## Top 5 Recommendations (by impact)

1. **Add Vitest and test the 6 pure workflow manipulation functions** in `comfyui.ts`. These are the extension's core, have complex branching logic, and require zero mocking.

2. **Create workflow fixture files** representing real ComfyUI workflows (img2img, txt2img, multi-LoadImage, various prompt node types). These serve as regression anchors and documentation of supported formats.

3. **Test `extractWorkflowParameters()` thoroughly.** Its 80+ lines of conditional logic across many node types and input fields are where bugs are most likely to appear as new ComfyUI node types are added.

4. **Extract and test prompt history logic** from `index.tsx`. The deduplication, ordering, and 20-item cap is easy to get wrong.

5. **Test `downloadResults()` path generation.** The logic for building output paths from original paths, suffixes, and ComfyUI filenames has multiple branches (img2img vs txt2img, unique filename generation). Getting this wrong silently overwrites user files.
