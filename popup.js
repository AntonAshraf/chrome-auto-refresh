const tabList = document.getElementById("tabList");
const interval = document.getElementById("interval");
const hardEvery = document.getElementById("hardEvery");
const rotateActiveTabs = document.getElementById("rotateActiveTabs");
const toggleButton = document.getElementById("toggle");
let fieldsInitialized = false;
let isRunning = false;

function sendSettingsUpdate() {
    chrome.runtime.sendMessage({
        action: "updateSettings",
        interval: Number(interval.value),
        hardEvery: Number(hardEvery.value),
        rotateActiveTabs: rotateActiveTabs.checked
    });
}

async function loadTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const status = await chrome.runtime.sendMessage({ action: "status" });

    tabList.innerHTML = "";

    for (const tab of tabs) {
        const item = document.createElement("div");
        item.className = "tab-item";
        item.setAttribute("role", "listitem");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = String(tab.id);
        checkbox.id = `tab-${tab.id}`;
        checkbox.className = "tab-checkbox";

        const img = document.createElement("img");
        img.className = "tab-favicon";
        img.src = tab.favIconUrl || "icons/128.png";
        img.alt = "";
        img.onerror = () => { img.src = "icons/128.png"; };

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.className = "tab-label";
        const titleSpan = document.createElement("span");
        titleSpan.className = 'tab-title';
        const fullTitle = tab.title || tab.url || `Tab ${tab.id}`;
        titleSpan.textContent = fullTitle;
        titleSpan.title = fullTitle;

        label.appendChild(img);
        label.appendChild(titleSpan);

        item.appendChild(checkbox);
        item.appendChild(label);

        tabList.appendChild(item);
    }

    const selectedTabIds = Array.isArray(status?.tabIds) && status.tabIds.length
        ? status.tabIds
        : status?.tabId != null
            ? [status.tabId]
            : tabs.filter(tab => tab.active).map(tab => tab.id);

    for (const checkbox of tabList.querySelectorAll("input[type=checkbox]")) {
        checkbox.checked = selectedTabIds.includes(Number(checkbox.value));
    }
}

tabList.addEventListener("change", () => {
    const selectedTabIds = Array.from(tabList.querySelectorAll("input[type=checkbox]:checked")).map(cb => Number(cb.value));
    chrome.runtime.sendMessage({
        action: "selectTabs",
        tabIds: selectedTabIds
    });
});

function update() {

    chrome.runtime.sendMessage({ action: "status" }, res => {

        if (!res) return;

        isRunning = res.running === true;
        toggleButton.textContent = isRunning ? "Stop" : "Start";
        toggleButton.classList.toggle("start-button", !isRunning);
        toggleButton.classList.toggle("stop-button", isRunning);

        if (!fieldsInitialized) {
            interval.value = res.interval;
            hardEvery.value = String(res.hardEvery);
            rotateActiveTabs.checked = res.rotateActiveTabs !== false;
            fieldsInitialized = true;
        }

        document.getElementById("count").textContent = res.count;
        document.getElementById("countdown").textContent = res.remaining;

    });

}

interval.addEventListener("input", sendSettingsUpdate);
hardEvery.addEventListener("change", sendSettingsUpdate);
rotateActiveTabs.addEventListener("change", sendSettingsUpdate);
toggleButton.addEventListener("click", () => {
    const selectedTabIds = Array.from(document.querySelectorAll("#tabList input[type=checkbox]:checked")).map(cb => Number(cb.value));

    if (isRunning) {
        chrome.runtime.sendMessage({ action: "stop" });
        return;
    }

    chrome.runtime.sendMessage({
        action: "start",
        interval: Number(interval.value),
        hardEvery: Number(hardEvery.value),
        tabIds: selectedTabIds
    });
});

loadTabs().then(update);

setInterval(update, 500);