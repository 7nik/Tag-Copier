/*jshint esversion: 6 */
const menuTitle = chrome.i18n.getMessage("copy_link_title");
const menu = {};

// TODO replace with chrome.contextMenus.update({id: id, visible: true/false})
/**
 * Add a button to the context menu to copy title of the link
 */
function showLinkTitle() {
    if (menu.linkTitle) return;
    chrome.contextMenus.create({
        id: "copyLinkTitle",
        title: menuTitle,
        contexts: ["link"],
    }, () => menu.linkTitle = true);
}

/**
 * Remove the button of coping title of the link from the context menu
 */
function hideLinkTitle() {
    if (!menu.linkTitle) return;
    chrome.contextMenus.remove("copyLinkTitle", () => menu.linkTitle = false);
}

/**
 * Add a button to the context menu to copy tags with a given profile
 * @param {string} id - name of the profile
 * @param {object} copyrightsOnly - if true doesn't show the button on page that have not types of tags
 */
function showCopyTags(id, copyrightsOnly) {
    if (menu[id]) return;
    chrome.contextMenus.create({
        id: id,
        title: id,
        contexts: ["page", "image"],
        documentUrlPatterns: copyrightsOnly ? [
            "*://danbooru.donmai.us/posts/*",
            "*://safebooru.donmai.us/posts/*",
            "*://hijiribe.donmai.us/posts/*",
            "*://sonohara.donmai.us/posts/*",
            "*://testbooru.donmai.us/posts/*",
            "*://chan.sankakucomplex.com/post/show/*",
            "*://idol.sankakucomplex.com/post/show/*",
            "*://konachan.com/post/show/*",
            "*://konachan.net/post/show/*",
            "*://yande.re/post/show/*",
            "*://art.4otaku.org/*",
            "*://anime-pictures.net/pictures/view_post/*",
            // "*://www.pixiv.net/*", // pixiv and seiga don't have tag types
            "*://gelbooru.com/*",
            "*://e-shuushuu.net/image/*",
            "*://www.zerochan.net/*",
            // "*://seiga.nicovideo.jp/seiga/*",
            "*://safebooru.org/*",
            "*://lolibooru.moe/post/show*",
            "*://e621.net/post/show/*",
            "*://e921.net/post/show/*"
        ] : [
            "*://danbooru.donmai.us/posts/*",
            "*://safebooru.donmai.us/posts/*",
            "*://hijiribe.donmai.us/posts/*",
            "*://sonohara.donmai.us/posts/*",
            "*://testbooru.donmai.us/posts/*",
            "*://chan.sankakucomplex.com/post/show/*",
            "*://idol.sankakucomplex.com/post/show/*",
            "*://konachan.com/post/show/*",
            "*://konachan.net/post/show/*",
            "*://yande.re/post/show/*",
            "*://art.4otaku.org/*",
            "*://anime-pictures.net/pictures/view_post/*",
            "*://www.pixiv.net/*",
            "*://gelbooru.com/*",
            "*://e-shuushuu.net/image/*",
            "*://www.zerochan.net/*",
            "*://seiga.nicovideo.jp/seiga/*",
            "*://safebooru.org/*",
            "*://lolibooru.moe/post/show*",
            "*://e621.net/post/show/*",
            "*://e921.net/post/show/*"
        ],
    }, () => menu[id] = true);
}

/**
 * Remove the button of coping tags from the context menu
 * @param {string} id - name of the profile
 */
function hideCopyTags(id) {
    if (!menu[id]) return;
    chrome.contextMenus.remove(id, () => menu[id] = false);
}

chrome.contextMenus.onClicked.addListener(
    (info, tab) => (info.menuItemId === "copyLinkTitle") ?
        chrome.tabs.sendMessage(tab.id, {method: "copyLinkTitle"}) :
        chrome.tabs.sendMessage(tab.id, {method: "copyTags", profile: info.menuItemId})
);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.method) {
        case "showLinkTitle": showLinkTitle(); break;
        case "hideLinkTitle": hideLinkTitle(); break;
        // allow to show button of coping link title
        case "enableLinkTitle":
            menu.linkTitle = false;
            break;
        // forbid to show button of coping link title
        case "disableLinkTitle":
            if (menu.linkTitle) {
                chrome.contextMenus.remove("copyLinkTitle", () => menu.linkTitle = "disabled");
            } else {
                menu.linkTitle = "disabled";
            }
            break;
        case "showCopyTags": showCopyTags(request.title, request.copyrightsOnly); break;
        case "hideCopyTags": hideCopyTags(request.title); break;
        case "isLinkTitleEnabled": sendResponse({enabled: (menu.linkTitle !== "disabled")}); break;
        default: console.error("Unknown method, request:", request);
    }
});

chrome.runtime.onInstalled.addListener(function(details){
    // console.log(details);
    if (details.reason === "install") {
        db.set({
            "copyLinkTitle": true,
            "profileNames": ["hashtag", "booru", "AP search", "AP add"],
            "profile:hashtag": {
                tagPrefix:      "#",
                tagDelimeter:   ", ",
                wordDelimeter:  "",
                lowerCase:      false,
                copyrightsOnly: true,
                buttonName:     "#",
                contextMenu:    false,
                hotkey:         "",
                profileName:    "hashtag",
            },
            "tagReplacing:hashtag": "{}",
            "profile:booru": {
                tagPrefix:      "",
                tagDelimeter:   " ",
                wordDelimeter:  "_",
                lowerCase:      true,
                copyrightsOnly: false,
                buttonName:     "",
                contextMenu:    false,
                hotkey:         "",
                profileName:    "booru",
            },
            "tagReplacing:booru": "{}",
            "profile:AP search": {
                tagPrefix:      "",
                tagDelimeter:   "&&",
                wordDelimeter:  " ",
                lowerCase:      true,
                copyrightsOnly: true,
                buttonName:     "S",
                contextMenu:    false,
                hotkey:         "Ctrl+Shift+S",
                profileName:    "AP search",
            },
            "tagReplacing:AP search": '{}',
            "profile:AP add": {
                tagPrefix:      "",
                tagDelimeter:   "||",
                wordDelimeter:  " ",
                lowerCase:      true,
                copyrightsOnly: false,
                buttonName:     "A",
                contextMenu:    false,
                hotkey:         "Ctrl+Shift+A",
                profileName:    "AP add",
            },
            "tagReplacing:AP add": '{"incredibly absurdres":"","absurdres":"","tall image":"","высокое изображение":"","長身像":"","wide image":"","широкое изображение":"","highres":"","высокое разрешение":"","long image":"","длиннокартинка":""}',
        });
    } else if (details.reason === "update") {
        if (details.previousVersion === "1.0.0" || details.previousVersion === "1.1.2") {
            let defaultSettings = {
                tagPrefix:          "",
                tagDelimeter:       "||",
                wordDelimeter:      " ",
                lowerCase:          true,
                copyAllTags:        3137, // Ctrl + Shift + A
                copyCopyrights:     3139, // Ctrl + Shift + C
                ignoredTags:        "",
                };
            db.get(defaultSettings)
                .then(items => {
                    db.clear();

                    let profile = {
                        tagPrefix: items.tagPrefix,
                        tagDelimeter: items.tagDelimeter,
                        wordDelimeter: items.wordDelimeter,
                        lowerCase: items.lowerCase,
                        copyrightsOnly: true,
                        buttonName: "",
                        contextMenu: true,
                        hotkey: (items.copyCopyrights&2048 ? "Ctrl+" : "")+(items.copyCopyrights&7096 ? "Alt+" : "")+(items.copyCopyrights&1024 ? "Shift+" : "")+String.fromCharCode(items.copyCopyrights%1024),
                        profileName: "old profile 1",
                    };
                    db.setProfile("old profile 1", profile);
                    profile.copyrightsOnly = false;
                    profile.hotkey = (items.copyAllTags&2048 ? "Ctrl+" : "")+(items.copyAllTags&7096 ? "Alt+" : "")+(items.copyAllTags&1024 ? "Shift+" : "")+String.fromCharCode(items.copyAllTags%1024);
                    profile.profileName = "old profile 2";
                    db.setProfile("old profile 2", profile);
                    let tagReplacing = JSON.stringify(items.ignoredTags.split("\n").reduce((o, w) => (o[w] = "", o), {}));
                    db.setTagReplacing("old profile 1", tagReplacing);
                    db.setTagReplacing("old profile 2", tagReplacing);
                    db.set({
                        profileNames: ["old profile 1", "old profile 2"],
                        currentProfile: "odl profile 1",
                        copyLinkTitle: true,
                    });
                });
        } else if (details.previousVersion === "1.1.2.1") {
            db.get("hotkeys", [])
                .then(hotkeys => {
                    hotkeys.forEach(hotkey => db.getProfile(hotkey.profile).then(p => {
                        p.copyCopyrights = hotkey.copyrightsOnly;
                        p.buttonName = hotkey.hotkey.substr(-1);
                        p.contextMenu = false;
                        p.hotkey = hotkey.hotkey;
                        p.profileName = hotkey.profile;
                        db.setProfile(hotkey.profile, p);
                    }));
                    db.remove("hotkeys");
                    db.set("copyLinkTitle", true);
                    return db.get("profileNames");
                })
                .then(profileNames => {
                    Promise.all(profileNames.map(pn => {
                        return db.get("ignoredTags:" + pn)
                            .then(tagReplacing => db.setTagReplacing(pn, tagReplacing));
                    }))
                    .then(() => db.remove(profileNames.map(pn => "ignoredTags:"+pn)));
                });
        }
    } // if (details.reason === "update")
});

db.get({profileNames: [], copyLinkTitle: true})
    .then(items => {
        if (!items.copyLinkTitle) {
            menu.linkTitle = "disabled";
        }
        items.profileNames.forEach(pn =>
            db.getProfile(pn).then(p =>
               p.contextMenu && showCopyTags(p.profileName, p.copyrightsOnly)));
    });
