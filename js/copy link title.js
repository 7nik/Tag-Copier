/*jshint esversion: 6 */
let linkTitle = "";

chrome.runtime.sendMessage({method: "isLinkTitleEnabled"}, function (response) {
    if (response.enabled === false) return;

    document.addEventListener("mousedown", function (event) {
        if (event.button !== 2) return; // was pressed non-right button
        // find an ancor
        let target = event.target;
        while (target !== document) {
            if (["A", "AREA"].indexOf(target.nodeName) >= 0) break;
            target = target.parentNode;
        }
        if (target === document) return; // target isn't ancor (link)

        linkTitle = (target.text || target.title || target.alt || "").trim();

        chrome.runtime.sendMessage({method: (linkTitle ? "showLinkTitle" : "hideLinkTitle" )});
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.method) {
            case "copyLinkTitle":
                document.oncopy = function(event) {
                    event.clipboardData.setData("text/plain", linkTitle);
                    event.preventDefault();
                };
                document.execCommand("Copy", false, null);
                document.oncopy = undefined;
                break;
            case "copyTags": break;
            default: console.error("Unknown method, request:", request);
        }
    });
});