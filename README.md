# 💎 Frosted Glass Sticky Notes (Optical Light Bending)

An aesthetic, distraction-free desktop sticky notes application engineered with **Windows 11 Acrylic backdrop**, **optical caustic light refraction**, and **prismatic dispersion** that bends light behind the glass as your cursor moves.

---

## ✨ Features

- **Translucent Frosted Glass Finish**: Built on Windows 11 hardware-accelerated Acrylic / Mica with real-time `backdrop-filter: blur(34px)` saturation & brightness tuning.
- **Dynamic Optical Light Bending**: Interactive caustic light beam and chromatic aberration dispersion (cyan, magenta, and gold spectral fringes) that simulate light bending through 12mm silica crystal glass.
- **Auto-Save to JSON**: Every keystroke, title update, font size change, window move, or resize is immediately debounced and saved directly into [`sticky_notes.json`](file:///d:/WORK%20LOG/NOTES/sticky_notes.json) in this folder.
- **Auto-Start on Boot**: Pre-configured in your Windows Startup directory (`shell:startup`) via `FrostedStickyNotes.vbs` to launch silently in the background when the PC boots up.
- **Multi-Window Floating Notes**: Spawn unlimited floating sticky notes (`+`), each with independent desktop positioning, sizes, themes, and pin states.
- **Always on Top (Pin 📌)**: Pin important notes above all applications, IDEs, and browser windows.
- **7 Luxury Glass Prism Finishes**:
  - 💎 **Diamond Ice** (Ultra-clear frosty silver with rainbow caustics)
  - 🔮 **Amethyst Prism** (Electric royal purple/violet refraction)
  - 🌊 **Aurora Cyan** (Bioluminescent oceanic turquoise glass)
  - 🌅 **Amber Honey** (Warm citrine sunlight refraction)
  - 🌸 **Rose Quartz** (Ethereal blushing pink crystal)
  - 🍃 **Emerald Mint** (Crisp jade/mint refraction)
  - 🌌 **Obsidian Neon** (Smoky dark tinted glass with glowing prism edge)
- **Interactive Checklists & Tools**:
  - `Todo` button inserts `[ ] ` checkmarks (pressing `Enter` continues the checklist).
  - `Time` button stamps current date and time `[Sep 24 10:45 AM]`.
  - `Aa` button cycles between compact, standard, and large typography.
  - `JSON` button immediately reveals your saved `sticky_notes.json` file.
- **System Notification Area (Tray) Support**:
  - Tray icon with quick actions: *New Note*, *Show All*, *Hide All*, *Toggle Startup*, *Open Notes Folder*, and *Exit*.

---

## 🚀 How to Run

### Option 1: Silent Launch (Recommended - Zero CMD Window)
Double-click:
```
Launch Sticky Notes.vbs
```
*(Runs completely in the background without any command prompt window flashing).*

### Option 2: Console / Dev Run
```bash
npm start
```
or double-click:
```
Launch Sticky Notes.bat
```

---

## ⚙️ Automatic Windows Startup

The app has already registered a silent startup launcher into:
```
C:\Users\ABSPC131\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\FrostedStickyNotes.vbs
```
Whenever your PC boots or you log in, your sticky notes will automatically float on your desktop right where you left them.

You can also toggle startup at any time:
1. Right-click the **Frosted Sticky Notes** icon in the Windows taskbar system tray.
2. Click **🚀 Launch on Windows Startup** to toggle on/off.

---

## 📁 Storage Structure

| File | Description |
|---|---|
| [`sticky_notes.json`](file:///d:/WORK%20LOG/NOTES/sticky_notes.json) | The JSON database holding all notes, coordinates, colors, and content |
| [`main.js`](file:///d:/WORK%20LOG/NOTES/main.js) | Electron main process, window management, and tray |
| [`preload.js`](file:///d:/WORK%20LOG/NOTES/preload.js) | Secure IPC bridge |
| [`renderer/`](file:///d:/WORK%20LOG/NOTES/renderer/) | HTML, CSS light refraction shaders, and UI controls |
| [`Launch Sticky Notes.vbs`](file:///d:/WORK%20LOG/NOTES/Launch%20Sticky%20Notes.vbs) | Silent Windows launcher script |
