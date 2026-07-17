# Simple Auto Refresh

A lightweight browser extension that automatically refreshes one or more selected tabs on a configurable timer, with optional hard reloads, active-tab rotation, live countdown, refresh counter, and persistent settings.

---
<img width="2816" height="1536" alt="Gemini_Generated_Image_8slyh18slyh18sly" src="https://github.com/user-attachments/assets/a10d6276-cdb5-45a6-a5d0-b74c93dd9518" />

---

## ✨ Features

- 🔄 Refresh one or more selected tabs
- ⏱️ Configurable refresh interval (seconds)
- 💥 Optional hard reload (bypass cache) every **N** refreshes
- 🔀 Optional active-tab rotation after each refresh cycle
- ▶️ Start and stop with a single toggle button
- ⏳ Live countdown timer
- 📊 Refresh counter
- 🏷️ Badge countdown on the extension icon
- 👁️ Badge automatically hides when more than 60 seconds remain
- 💾 Settings automatically saved using Chrome Storage
- 🔁 Restores the previous state after reopening the popup
- ♻️ Remembers settings after Chrome restarts
- ⚡ Built with Manifest V3

---

## 🚀 How It Works

1. Open the extension popup.
2. Select one or more tabs to refresh.
3. Set the refresh interval in seconds.
4. Choose how often a hard reload should occur.
5. Optionally enable or disable active-tab rotation.
6. Click **Start** to begin refreshing.
7. Click **Stop** to stop refreshing and reset the timer.

---

## 📦 Installation (Developer Mode)

### Chrome

1. Open:

   ```
   chrome://extensions
   ```

2. Enable **Developer mode**.

3. Click **Load unpacked**.

4. Select the project folder.

5. The extension will appear in the toolbar.

6. (Optional) Pin it for quick access.

### Microsoft Edge

1. Open:

   ```
   edge://extensions
   ```

2. Enable **Developer mode**.

3. Click **Load unpacked**.

4. Select the project folder.

---

## 🛠️ Usage

1. Open the extension popup.
2. Select one or more tabs.
3. Enter the refresh interval.
4. Select the hard reload frequency.
5. (Optional) Enable active-tab rotation.
6. Click **Start**.
7. Click **Stop** whenever you want to end the refresh cycle.

---

## 📁 Project Structure

```
SimpleAutoRefresh/
│
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
    ├── 128.png
    └── 256.png

```

---

## 📝 Notes

- Hard reload uses cache bypass when supported by the browser.
- All settings are stored locally using Chrome Storage.
- Refreshing continues even if you switch to another tab.
- The popup can be closed at any time without stopping the timer.
- The extension remembers its configuration after browser restarts.

---

## 🔒 Permissions

- `tabs` — Refresh and manage selected tabs.
- `storage` — Save extension settings and state.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it.
