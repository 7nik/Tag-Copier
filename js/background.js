/* eslint-env webextensions */
/* global db */

"use strict";

// sites which support tag type
const copyrightLinks = [
    "*://danbooru.donmai.us/posts/*",
    "*://safebooru.donmai.us/posts/*",
    "*://hijiribe.donmai.us/posts/*",
    "*://sonohara.donmai.us/posts/*",
    "*://testbooru.donmai.us/posts/*",
    "*://chan.sankakucomplex.com/post/show/*",
    "*://beta.sankakucomplex.com/post/show/*",
    "*://idol.sankakucomplex.com/post/show/*",
    "*://konachan.com/post/show/*",
    "*://konachan.net/post/show/*",
    "*://yande.re/post/show/*",
    "*://art.4otaku.org/*",
    "*://anime-pictures.net/pictures/view_post/*",
    "*://gelbooru.com/*",
    "*://e-shuushuu.net/image/*",
    "*://www.zerochan.net/*",
    "*://safebooru.org/*",
    "*://lolibooru.moe/post/show*",
    "*://e621.net/post/show/*",
    "*://e921.net/post/show/*",
    "*://nozomi.la/post/*",
];
// all supported sites
const allLinks = [
    ...copyrightLinks,
    "*://www.pixiv.net/*",
    "*://seiga.nicovideo.jp/seiga/*",
];

const defaultDB = {
    copyLinkTitle: false,
    currentProfile: "hashtag",
    profileNames: ["hashtag", "booru", "AP search", "AP add"],
    "profile:hashtag": {
        tagPrefix:        "#",
        tagDelimeter:     ", ",
        wordDelimeter:    "",
        lowerCase:        false,
        copyrightsOnly:   true,
        allTagsOtherwise: false,
        buttonName:       "#",
        contextMenu:      false,
        hotkey:           "",
        profileName:      "hashtag",
    },
    "tagReplacing:hashtag_0": "{}",
    "tagReplacing:hashtag_length": 1,
    "profile:booru": {
        tagPrefix:        "",
        tagDelimeter:     " ",
        wordDelimeter:    "_",
        lowerCase:        true,
        copyrightsOnly:   false,
        allTagsOtherwise: false,
        buttonName:       "",
        contextMenu:      false,
        hotkey:           "",
        profileName:      "booru",
    },
    "tagReplacing:booru_0": "{}",
    "tagReplacing:booru_length": 1,
    "profile:AP search": {
        tagPrefix:        "",
        tagDelimeter:     "&&",
        wordDelimeter:    " ",
        lowerCase:        true,
        copyrightsOnly:   true,
        allTagsOtherwise: false,
        buttonName:       "S",
        contextMenu:      false,
        hotkey:           "Ctrl+Shift+S",
        profileName:      "AP search",
    },
    "tagReplacing:AP search_0": "{}",
    "tagReplacing:AP search_length": 1,
    "profile:AP add": {
        tagPrefix:        "",
        tagDelimeter:     "||",
        wordDelimeter:    " ",
        lowerCase:        true,
        copyrightsOnly:   false,
        allTagsOtherwise: false,
        buttonName:       "A",
        contextMenu:      false,
        hotkey:           "Ctrl+Shift+A",
        profileName:      "AP add",
    },
    "tagReplacing:AP add_0": JSON.stringify({
        absurdres: "",
        highres: "",
        "incredibly absurdres": "",
        "long image": "",
        "tall image": "",
        "wide image": "",
        "высокое изображение": "",
        "высокое разрешение": "",
        длиннокартинка: "",
        "широкое изображение": "",
        長身像: "",
    }),
    "tagReplacing:AP add_length": 1,
};

const copyLinkTitlePermissions = {
    permissions: ["tabs", "activeTab"],
    origins: ["<all_urls>"],
};

const menu = {
    copyLinkTitle: "disabled",
};

function insertLinkTitle (tabId, changeInfo, tab) {
    if (changeInfo.status !== "loading" || !tab.url.startsWith("http")) return;
    chrome.tabs.executeScript(
        tabId,
        { file: "js/copy link title.js" },
        () => chrome.runtime.lastError,
    );
}

/**
 * Create the button to the context menu to copy title of the link
 */
function enableLinkTitle () {
    console.trace();
    chrome.permissions.contains(copyLinkTitlePermissions, (has) => {
        if (!has) return;
        menu.copyLinkTitle = false;
        chrome.contextMenus.create({
            id: "copyLinkTitle",
            title: chrome.i18n.getMessage("copy_link_title"),
            contexts: ["link"],
        }, () => {
            chrome.tabs.query({}, (tabs) => tabs.forEach((tab) => {
                insertLinkTitle(tab.id, { status: "loading" }, tab);
            }));
            chrome.tabs.onUpdated.addListener(insertLinkTitle);
            menu.copyLinkTitle = true;
            chrome.runtime.lastError;
        });
    });
}

/**
 * Delete the button to the context menu to copy title of the link
 */
function disableLinkTitle () {
    if (menu.copyLinkTitle === "disabled") return;
    chrome.contextMenus.remove(
        "copyLinkTitle",
        () => {
            chrome.tabs.onUpdated.removeListener(insertLinkTitle);
            menu.copyLinkTitle = "disabled";
        },
    );
}

/**
 * Show the button to the context menu to copy title of the link
 */
function showLinkTitle () {
    if (menu.copyLinkTitle !== false) return;
    chrome.contextMenus.update(
        "copyLinkTitle",
        { visible: true },
        () => { menu.copyLinkTitle = true; },
    );
}

/**
 * Hide the button of coping title of the link from the context menu
 */
function hideLinkTitle () {
    if (menu.copyLinkTitle !== true) return;
    chrome.contextMenus.update(
        "copyLinkTitle",
        { visible: false },
        () => { menu.copyLinkTitle = false; },
    );
}

/**
 * Add a button to the context menu to copy tags with a given profile
 * @param {string} id - name of the profile
 * @param {object} copyrightsOnly - if true doesn't
 * show the button on page that have not types of tags
 */
function showCopyTags (id, copyrightsOnly) {
    if (menu[id]) return;

    chrome.contextMenus.create({
        id,
        title: id,
        contexts: ["page", "image"],
        documentUrlPatterns: copyrightsOnly ? copyrightLinks : allLinks,
    }, () => { menu[id] = true; });
}

/**
 * Remove the button of coping tags from the context menu
 * @param {string} id - name of the profile
 */
function hideCopyTags (id) {
    if (!menu[id]) return;
    chrome.contextMenus.remove(id, () => { menu[id] = false; });
}

chrome.contextMenus.onClicked.addListener((info, tab) => (
    (info.menuItemId === "copyLinkTitle")
        ? chrome.tabs.sendMessage(tab.id, { method: "copyLinkTitle" })
        : chrome.tabs.sendMessage(tab.id, { method: "copyTags", profile: info.menuItemId })
));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.method) {
        case "showLinkTitle":
            showLinkTitle();
            break;

        case "hideLinkTitle":
            hideLinkTitle();
            break;

        // allow to show button of coping link title
        case "enableLinkTitle":
            enableLinkTitle();
            break;

        // forbid to show button of coping link title
        case "disableLinkTitle":
            disableLinkTitle();
            break;

        case "showCopyTags":
            showCopyTags(request.title, request.copyrightsOnly);
            break;

        case "hideCopyTags":
            hideCopyTags(request.title);
            break;

        case "isLinkTitleEnabled":
            sendResponse({ enabled: (menu.copyLinkTitle !== "disabled") });
            break;

        default: console.error("Unknown method, request:", request);
    }
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        const { profileNames } = await db.get({ profileNames: null });
        if (profileNames === null) {
            db.set(defaultDB);
        }
    } else if (details.reason === "update" && details.previousVersion === "1.2.3.4") {
        const items = await db.get(null);
        const add = {};
        const remove = [];
        Reflect.ownKeys(items).forEach((key) => {
            if (key.startsWith("tagReplacing:")) {
                const profileName = key.replace(/^tagReplacing:|_length$|_\d+$/g, "");
                if (!items.profileNames.includes(profileName)) {
                    remove.push(key);
                    return;
                }
                if (!key.match(/_length$|_\d+$/)) {
                    add[`${key}_0`] = items[key];
                    remove.push(key);
                }
                return;
            }
            if (key.startsWith("profile:")) {
                const profile = items[key];
                if (!items.profileNames.includes(profile.profileName)) {
                    remove.push(key);
                    return;
                }
                profile.allTagsOtherwise = false;
                add[key] = profile;
                return;
            }
            if (!["copyLinkTitle", "currentProfile", "profileNames"].includes(key)) {
                remove.push(key);
            }
        });
        db.set(add).then(() => db.remove(remove));
    }
});

// initialize when browser starts up

db.get({ profileNames: [], copyLinkTitle: false })
    .then((items) => {
        if (items.copyLinkTitle) {
            enableLinkTitle();
        }
        items.profileNames.forEach((profileName) => {
            db.getProfile(profileName).then(({ contextMenu, copyrightsOnly }) => {
                if (contextMenu) showCopyTags(profileName, copyrightsOnly);
            });
        });
    });
