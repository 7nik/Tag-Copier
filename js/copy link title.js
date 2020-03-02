/* eslint-env webextensions */

"use strict";

(function fn () {
    if (window.copyLinkTitle) return;
    window.copyLinkTitle = true;

    let linkTitle = "";

    document.addEventListener("mousedown", (event) => {
        if (event.button !== 2) return; // was pressed non-right button
        // find an ancor
        let { target } = event;
        while (target !== document) {
            if (["A", "AREA"].includes(target.nodeName)) break;
            target = target.parentNode;
        }
        if (target === document) return; // target isn't <a> (link)

        linkTitle = (target.text || target.title || target.alt || "").trim();

        chrome.runtime.sendMessage({ method: (linkTitle ? "showLinkTitle" : "hideLinkTitle"), linkTitle });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.method) {
            case "copyLinkTitle":
                // chrome only solution
                // document.addEventListener(
                //     "copy",
                //     (event) => {
                //         event.clipboardData.setData("text/plain", linkTitle);
                //         event.preventDefault();
                //     },
                //     { once: true },
                // );
                // document.execCommand("copy", false, null);

                // can be call only in context script
                navigator.clipboard.writeText(linkTitle)
                    .catch((err) => console.error("Failed to copy text", linkTitle, err));
                break;
            case "copyTags": break; // for content.js
            default: console.error("Unknown method, request:", request);
        }
    });
}());
