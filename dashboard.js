const trackingState = document.getElementById("trackingState");
const nextRefresh = document.getElementById("nextRefresh");
const nextHardReload = document.getElementById("nextHardReload");
const changeList = document.getElementById("changeList");
const emptyState = document.getElementById("emptyState");
const resetButton = document.getElementById("resetButton");
let refreshTimer = null;

function formatUrl(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url || "";
    }
}

function render(state) {
    const details = state?.tabDetails && typeof state.tabDetails === "object" ? state.tabDetails : {};
    const items = Object.entries(details)
        .map(([tabId, detail]) => ({ tabId: Number(tabId), detail }))
        .filter(item => (item.detail?.changes || 0) > 0);

    trackingState.textContent = state?.notifyOnContentChange ? "On" : "Off";
    nextRefresh.textContent = state?.running ? `${Math.max(0, Number(state.remaining) || 0)}s` : "Stopped";

    if (state?.running && Number.isFinite(Number(state.hardEvery)) && Number(state.hardEvery) > 0) {
        const hardEvery = Number(state.hardEvery);
        const count = Number(state.count) || 0;
        const remainder = count % hardEvery;
        const untilHardReload = remainder === 0 ? hardEvery : hardEvery - remainder;
        nextHardReload.textContent = `${untilHardReload} refresh${untilHardReload === 1 ? "" : "es"}`;
    } else {
        nextHardReload.textContent = "-";
    }

    changeList.innerHTML = "";
    emptyState.style.display = items.length ? "none" : "block";

    for (const item of items) {
        const row = document.createElement("article");
        row.className = "change-item";
        const header = document.createElement("div");
        header.className = "change-header";

        const label = document.createElement("div");
        label.className = "change-label";

        const title = document.createElement("strong");
        title.textContent = item.detail.title || `Tab ${item.tabId}`;

        const meta = document.createElement("span");
        meta.textContent = `${item.detail.changes || 0} change${(item.detail.changes || 0) === 1 ? "" : "s"}`;

        label.appendChild(title);
        label.appendChild(meta);

        header.appendChild(label);
        row.appendChild(header);

        const line = document.createElement("div");
        line.className = "change-meta";

        const pill = document.createElement("span");
        pill.className = "change-pill";
        pill.textContent = `${item.detail.changes || 0} total changes`;

        line.appendChild(pill);

        if (item.detail.url) {
            const link = document.createElement("a");
            link.className = "change-link";
            link.href = item.detail.url;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = formatUrl(item.detail.url);
            line.appendChild(link);
        }

        row.appendChild(line);

        changeList.appendChild(row);
    }
}

async function refresh() {
    const state = await chrome.runtime.sendMessage({ action: "status" });
    render(state);
}

resetButton.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ action: "resetDashboard" });
    refresh();
});

chrome.storage.onChanged.addListener(changes => {
    if (changes.state) {
        render(changes.state.newValue);
    }
});

refreshTimer = setInterval(refresh, 1000);
refresh();
