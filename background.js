let state = {
    running: false,
    tabId: null,
    tabIds: [],
    tabIndex: 0,
    interval: 10,
    remaining: 10,
    count: 0,
    hardEvery: 10,
    rotateActiveTabs: true,
    notifyOnContentChange: false,
    contentChangeTotal: 0,
    tabDetails: {}
};

let timer = null;

function normalizeState() {
    if (!Array.isArray(state.tabIds)) {
        state.tabIds = state.tabId != null ? [state.tabId] : [];
    }

    state.tabIds = state.tabIds
        .map(tabId => Number(tabId))
        .filter(tabId => Number.isFinite(tabId));

    if (state.tabId != null) {
        const normalizedTabId = Number(state.tabId);
        state.tabId = Number.isFinite(normalizedTabId) ? normalizedTabId : null;
    }

    if (typeof state.tabIndex !== "number") {
        state.tabIndex = 0;
    }

    if (typeof state.rotateActiveTabs !== "boolean") {
        state.rotateActiveTabs = true;
    }

    if (typeof state.notifyOnContentChange !== "boolean") {
        state.notifyOnContentChange = false;
    }

    if (typeof state.contentChangeTotal !== "number") {
        state.contentChangeTotal = 0;
    }

    if (!state.tabDetails || typeof state.tabDetails !== "object") {
        state.tabDetails = {};
    }
}

function ensureTabDetail(tabId, info = {}) {
    const key = String(tabId);
    const existing = state.tabDetails[key] || {};

    state.tabDetails[key] = {
        changes: typeof existing.changes === "number" ? existing.changes : 0,
        title: info.title ?? existing.title ?? `Tab ${tabId}`,
        url: info.url ?? existing.url ?? "",
        contentSnippet: info.contentSnippet ?? existing.contentSnippet ?? ""
    };
}

async function syncTrackedTabs(tabIds) {
    const nextTabDetails = {};

    for (const rawTabId of tabIds) {
        const tabId = Number(rawTabId);

        if (!Number.isFinite(tabId)) {
            continue;
        }

        let tab = null;

        try {
            tab = await chrome.tabs.get(tabId);
        } catch (e) { }

        const key = String(tabId);
        const existing = state.tabDetails[key] || {};

        nextTabDetails[key] = {
            changes: typeof existing.changes === "number" ? existing.changes : 0,
            title: tab?.title ?? existing.title ?? `Tab ${tabId}`,
            url: tab?.url ?? existing.url ?? "",
            contentSnippet: existing.contentSnippet ?? ""
        };
    }

    state.tabDetails = nextTabDetails;
    save();
}

function isTrackedTab(tabId) {
    return state.tabIds.includes(tabId);
}

function removeTab(tabId) {
    state.tabIds = state.tabIds.filter(id => id !== tabId);
    delete state.tabDetails[String(tabId)];

    if (state.tabId === tabId) {
        state.tabId = state.tabIds[0] ?? null;
    }

    if (state.tabIndex >= state.tabIds.length) {
        state.tabIndex = 0;
    }

    save();
}

chrome.storage.local.get("state", d => {
    if (d.state) {
        state = d.state;
        normalizeState();
        if (state.running)
            startTimer();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setIcon({ path: { 16: "icons/128.png", 32: "icons/128.png", 128: "icons/256.png" } });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.action.setIcon({ path: { 16: "icons/128.png", 32: "icons/128.png", 128: "icons/256.png" } });
});

function save() {
    chrome.storage.local.set({ state });
}

function updateBadge() {

    if (!state.running) {
        chrome.action.setBadgeText({ text: "" });
        return;
    }

    if (state.remaining > 1000) {
        chrome.action.setBadgeText({ text: "" });
        return;
    }

    chrome.action.setBadgeBackgroundColor({ color: "#1976d2" });
    chrome.action.setBadgeText({
        text: String(state.remaining)
    });

}

function startTimer() {

    clearInterval(timer);

    timer = setInterval(async () => {

        if (!state.running || !state.tabIds.length) {
            clearInterval(timer);
            return;
        }

        state.remaining--;

        updateBadge();

        if (state.remaining <= 0) {

            state.count++;

            const hard = (state.count % state.hardEvery) == 0;
            const currentIndex = state.tabIndex % state.tabIds.length;
            const nextIndex = (currentIndex + 1) % state.tabIds.length;
            const nextActiveTabId = state.tabIds[nextIndex];
            state.tabId = state.rotateActiveTabs ? nextActiveTabId : state.tabIds[currentIndex];

            try {

                for (const tabId of state.tabIds) {
                    if (hard) {

                        await chrome.tabs.reload(tabId, { bypassCache: true });

                    } else {

                        await chrome.tabs.reload(tabId);

                    }
                }

                if (state.rotateActiveTabs && nextActiveTabId != null) {
                    await chrome.tabs.update(nextActiveTabId, { active: true });
                }

                state.tabIndex = state.rotateActiveTabs ? nextIndex : currentIndex;

            } catch (e) { }

            state.remaining = state.interval;

            updateBadge();

            save();

        }

    }, 1000);

}

chrome.runtime.onMessage.addListener((msg, s, r) => {

    if (msg.action == "tabContentChanged") {

        const tabId = s?.tab?.id;

        if (state.notifyOnContentChange && tabId != null && isTrackedTab(tabId)) {
            const key = String(tabId);
            ensureTabDetail(tabId, { title: msg.title, url: msg.url, contentSnippet: msg.contentSnippet });
            state.tabDetails[key].changes++;
            state.contentChangeTotal++;
            save();
        }

    }

    if (msg.action == "selectTab") {

        state.tabId = msg.tabId;
        state.tabIds = msg.tabId != null ? [msg.tabId] : [];
        state.tabIndex = 0;

        syncTrackedTabs(state.tabIds);
        save();

    }

    if (msg.action == "selectTabs") {

        state.tabIds = Array.isArray(msg.tabIds) ? msg.tabIds.filter(tabId => tabId != null) : [];
        state.tabId = state.tabIds[0] ?? null;
        state.tabIndex = 0;

        syncTrackedTabs(state.tabIds);
        save();

    }

    if (msg.action == "start") {

        state.interval = msg.interval;
        state.remaining = msg.interval;
        state.hardEvery = msg.hardEvery;
        state.tabIds = Array.isArray(msg.tabIds) && msg.tabIds.length ? msg.tabIds : [msg.tabId ?? state.tabId].filter(tabId => tabId != null);
        state.tabId = state.tabIds[0] ?? null;
        state.tabIndex = 0;
        state.running = true;

        syncTrackedTabs(state.tabIds);
        save();

        updateBadge();
        startTimer();

    }

    if (msg.action == "updateSettings") {

        if (typeof msg.interval === "number" && msg.interval > 0) {
            state.interval = msg.interval;
            if (!state.running) {
                state.remaining = msg.interval;
            }
        }

        if (typeof msg.hardEvery === "number" && msg.hardEvery > 0) {
            state.hardEvery = msg.hardEvery;
        }

        if (typeof msg.rotateActiveTabs === "boolean") {
            state.rotateActiveTabs = msg.rotateActiveTabs;
        }

        if (typeof msg.notifyOnContentChange === "boolean") {
            state.notifyOnContentChange = msg.notifyOnContentChange;
        }

        save();

    }

    if (msg.action == "resetDashboard") {

        state.contentChangeTotal = 0;

        for (const tabId of state.tabIds) {
            ensureTabDetail(tabId);
            state.tabDetails[String(tabId)].changes = 0;
            state.tabDetails[String(tabId)].contentSnippet = "";
        }

        save();

    }

    if (msg.action == "stop") {

        state.running = false;
        state.remaining = 0;
        state.count = 0;
        state.tabIndex = 0;

        clearInterval(timer);

        updateBadge();

        save();

    }

    if (msg.action == "status") {

        r(state);

    }

});

chrome.tabs.onRemoved.addListener(tabId => {
    if (isTrackedTab(tabId)) {
        removeTab(tabId);
    }
});

chrome.runtime.onStartup.addListener(() => {

    chrome.storage.local.get("state", d => {

        if (d.state) {

            state = d.state;
            normalizeState();

            if (state.running)
                startTimer();

        }

    });

});