const tabSelect = document.getElementById("tabSelect");
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

    tabSelect.innerHTML = "";
    tabSelect.multiple = true;

    for (const tab of tabs) {
        const option = document.createElement("option");
        option.value = String(tab.id);
        option.textContent = tab.title || tab.url || `Tab ${tab.id}`;
        tabSelect.appendChild(option);
    }

    const selectedTabIds = Array.isArray(status?.tabIds) && status.tabIds.length
        ? status.tabIds
        : status?.tabId != null
            ? [status.tabId]
            : tabs.filter(tab => tab.active).map(tab => tab.id);

    for (const option of tabSelect.options) {
        option.selected = selectedTabIds.includes(Number(option.value));
    }
}

tabSelect.onchange = () => {
    const selectedTabIds = Array.from(tabSelect.selectedOptions).map(option => Number(option.value));
    chrome.runtime.sendMessage({
        action: "selectTabs",
        tabIds: selectedTabIds
    });
};

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
    const selectedTabIds = Array.from(tabSelect.selectedOptions).map(option => Number(option.value));

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