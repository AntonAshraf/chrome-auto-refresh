let state = {
    running: false,
    tabId: null,
    tabIds: [],
    tabIndex: 0,
    interval: 10,
    remaining: 10,
    count: 0,
    hardEvery: 10,
    rotateActiveTabs: true
};

let timer = null;

chrome.storage.local.get("state", d => {
    if (d.state) {
        state = d.state;
        if (!Array.isArray(state.tabIds)) {
            state.tabIds = state.tabId != null ? [state.tabId] : [];
        }
        if (typeof state.tabIndex !== "number") {
            state.tabIndex = 0;
        }
        if (typeof state.rotateActiveTabs !== "boolean") {
            state.rotateActiveTabs = true;
        }
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

    if (msg.action == "selectTab") {

        state.tabId = msg.tabId;
        state.tabIds = msg.tabId != null ? [msg.tabId] : [];
        state.tabIndex = 0;

        save();

    }

    if (msg.action == "selectTabs") {

        state.tabIds = Array.isArray(msg.tabIds) ? msg.tabIds.filter(tabId => tabId != null) : [];
        state.tabId = state.tabIds[0] ?? null;
        state.tabIndex = 0;

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

chrome.runtime.onStartup.addListener(() => {

    chrome.storage.local.get("state", d => {

        if (d.state) {

            state = d.state;

            if (state.running)
                startTimer();

        }

    });

});