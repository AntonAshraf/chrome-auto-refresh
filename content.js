let lastSignature = "";
let debounceTimer = null;
let lastChangedSnippet = "";

function canSendRuntimeMessage() {
    return typeof chrome !== "undefined"
        && !!chrome.runtime
        && typeof chrome.runtime.sendMessage === "function"
        && typeof chrome.runtime.id === "string"
        && chrome.runtime.id.length > 0;
}

function getSignature() {
    const title = document.title || "";
    const bodyText = document.body ? document.body.innerText : "";
    const normalizedText = bodyText.replace(/\s+/g, " ").trim().slice(0, 5000);

    return `${title}\n${normalizedText}`;
}

function refreshBaseline() {
    lastSignature = getSignature();
}

function getNodeSnippet(node) {
    if (!node) {
        return "";
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node.nodeType === Node.ELEMENT_NODE ? node : null;

    if (!element) {
        return "";
    }

    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();

    return text.slice(0, 240);
}

function reportChange() {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        const signature = getSignature();

        if (signature !== lastSignature) {
            lastSignature = signature;
            const contentSnippet = lastChangedSnippet || getNodeSnippet(document.body) || "Content changed";
            lastChangedSnippet = "";

            if (canSendRuntimeMessage()) {
                try {
                    chrome.runtime.sendMessage({
                        action: "tabContentChanged",
                        title: document.title || "",
                        url: location.href,
                        contentSnippet
                    });
                } catch (e) {
                    // Ignore transient extension-context issues.
                }
            }
        }
    }, 1200);
}

refreshBaseline();

const observer = new MutationObserver(reportChange);

function observeDocument() {
    if (document.documentElement) {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
    }
}

observer.disconnect();
const previewObserver = new MutationObserver(records => {
    for (const record of records) {
        const candidate = getNodeSnippet(record.target) || Array.from(record.addedNodes || []).map(getNodeSnippet).find(Boolean) || Array.from(record.removedNodes || []).map(getNodeSnippet).find(Boolean);

        if (candidate) {
            lastChangedSnippet = candidate;
            break;
        }
    }

    reportChange();
});

observeDocument();

function watchPreview() {
    if (document.documentElement) {
        previewObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
    }
}

watchPreview();

window.addEventListener("load", refreshBaseline, { once: true });
window.addEventListener("hashchange", reportChange);
window.addEventListener("popstate", reportChange);
