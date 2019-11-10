/* eslint-env webextensions */

"use strict";

(function fn () {
    if (window.copyLinkTitle) return;
    window.copyLinkTitle = true;

    let linkTitle = "";

    function copyLinkTitle (event) {
        event.clipboardData.setData("text/plain", linkTitle);
        event.preventDefault();
    }

    chrome.runtime.sendMessage({ method: "isLinkTitleEnabled" }, (response) => {
        if (response.enabled === false) return;

        document.addEventListener("mousedown", (event) => {
            if (event.button !== 2) return; // was pressed non-right button
            // find an ancor
            let { target } = event;
            while (target !== document) {
                if (["A", "AREA"].includes(target.nodeName)) break;
                target = target.parentNode;
            }
            if (target === document) return; // target isn't ancor (link)

            linkTitle = (target.text || target.title || target.alt || "").trim();

            chrome.runtime.sendMessage({ method: (linkTitle ? "showLinkTitle" : "hideLinkTitle") });
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.method) {
                case "copyLinkTitle":
                    document.addEventListener("copy", copyLinkTitle, { once: true });
                    document.execCommand("Copy", false, null);
                    break;
                case "copyTags": break;
                default: console.error("Unknown method, request:", request);
            }
        });
    });
}());
