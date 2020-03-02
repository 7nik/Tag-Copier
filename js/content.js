/* eslint-env webextensions */
/* global db */

"use strict";

let profiles = [];
let queries;
let dbready;

async function copyTags (profileName) {
    const profile = await db.getProfile(profileName);
    const tagReplacing = await db.getTagReplacing(profileName);

    const replaceTag = (elem) => (
        elem.toLowerCase() in tagReplacing
            ? tagReplacing[elem.toLowerCase()]
            : elem
    );

    let query = queries[profile.copyrightsOnly ? 1 : 0];
    // if support of tag type
    if (!query) {
        if (profile.allTagsOtherwise) {
            [query] = queries;
        } else {
            showMsg(chrome.i18n.getMessage("content_msg_nothing_copied") + profileName);
            return;
        }
    }
    let tags = $(query)
        .get()
        .map((elem) => {
            const text = elem.firstNode ? elem.firstNode.textContent : elem.textContent;
            return replaceTag(profile.tagPrefix + replaceTag(text))
                .replace(/\s/g, profile.wordDelimeter);
        })
        .filter((elem) => elem && (elem !== "+") && (elem !== "–"))
        .join(profile.tagDelimeter);

    if (profile.lowerCase) {
        tags = tags.toLowerCase();
    }

    if (!tags) {
        showMsg(chrome.i18n.getMessage("content_msg_nothing_copied") + profileName);
        return;
    }

    if (navigator.userAgent.includes("Firefox")) {
        chrome.runtime.sendMessage({ method: "textToClipboard", text: tags });
    } else {
        // $(document).one("copy", (ev) => {
        //     ev.originalEvent.clipboardData.setData("text/plain", tags);
        //     return false;
        // });
        // document.execCommand("copy", false, null);
        navigator.clipboard.writeText(tags)
            .catch((err) => console.error("Failed to copy text", tags, err));
    }

    showMsg(chrome.i18n.getMessage("content_msg_tags_copied") + profileName);
}

function showMsg (msg) {
    const $container = $(`
        <center style="
            position: fixed;
            top: 49%;
            left: 45%;
            z-index: 1;"
        >
            <h3 style="
                background: rgba(0,0,0,0.7);
                color: white;
                margin: 0;
                padding: 3px 10px 5px 10px;
                box-shadow: 0 0 5px 5px rgba(0,0,0,0.7);"
            >
                ${msg}
            </h3>
        </center>
        `);
    $container.appendTo("body");
    setTimeout(() => $container.animate({ opacity: 0 }, 2000, () => $container.remove()), 2000);
}

/*
    options = {
        // the css applied to the buttons
        css: {height: "16px", width: "16px", margin: "0 6px 0 0", cursor: "pointer"},
        fullOnly: false, // if true - add only buttons which copy all tags
        reversed: false, // if true - add the buttons in the reversed order
        container: string, // selector for element in which the buttons will be added
        subContainer: string(html), // container for the buttons
        inserting: "prepend", // name of function for insertion
        color: string, // color of the buttons, default - black
    }
*/
async function addButtons (options) {
    options.css = { // eslint-disable-line no-param-reassign
        height: "16px",
        width: "16px",
        margin: "0 6px 0 0",
        cursor: "pointer",
        ...options.css,
    };
    await dbready;
    let buttons = profiles.filter((p) => p.buttonName);
    if (options.fullOnly) {
        buttons = buttons.filter((p) => !p.copyrightsOnly || p.allTagsOtherwise);
    }
    if (options.reversed) {
        buttons.reverse();
    }
    /* eslint-disable max-len */
    let $buttons = $(buttons.map((p) => $(`
        <svg profile="${p.profileName}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
            <path d="M 0 320 Q 0 192 128 192 h 576 Q 832 192 832 320 v 576 Q 832 1024 704 1024 h -576 Q 0 1024 0 896 v -576 h 64 v 576 Q 64 960 128 960 h 576 Q 768 960 768 896 v -576 Q 768 256 704 256 h -576 Q 64 256 64 320 Z"></path>
            <path d="M 192 128 Q 192 0 320 0 h 576 Q 1024 0 1024 128 v 576 Q 1024 832 896 832 v -64 Q 960 768 960 704 v -576 Q 960 64 896 64 h -576 Q 256 64 256 128 Z"></path>
            <text x="416" y="680" style="dominant-baseline: middle; text-anchor: middle; font: ${1280 / (p.buttonName.length + 1)}px Arial; ">${p.buttonName}</text>
        </svg>`)[0]));
    /* eslint-enable max-len */
    $buttons.css(options.css);
    if (options.color) {
        $buttons.children().attr("fill", options.color);
    }
    $buttons.click((ev) => copyTags(ev.currentTarget.getAttribute("profile")));
    if (options.subContainer) {
        $buttons = $(options.subContainer).append($buttons);
    }
    let n = 0;
    const add = () => {
        const container = $(options.container);
        if (n > 100) {
            console.warn("error of adding of buttons");
            return;
        }
        if (container.length > 0) {
            container[options.inserting || "prepend"]($buttons);
        } else {
            n += 1;
            setTimeout(add, 300);
        }
    };
    add();
}

function isPath (path) {
    return typeof path === "string"
        ? window.location.pathname === path
        : !!window.location.pathname.match(path);
}

function isSearch (search) {
    return typeof search === "string"
        ? window.location.search === search
        : !!window.location.search.match(search);
}

dbready = db.get("profileNames", [])
    .then((profileNames) => {
        const fields = {};
        profileNames.forEach((profileName) => { fields[`profile:${profileName}`] = {}; });
        return db.get(fields);
    })
    .then((profilesObj) => {
        profiles = Object.values(profilesObj);
    });

$(document).keydown((event) => {
    let key = "";
    if (event.ctrlKey) key += "Ctrl+";
    if (event.altKey) key += "Alt+";
    if (event.shiftKey) key += "Shift+";
    key += (event.key.length > 1) ? event.key : String.fromCharCode(event.which || event.keyCode);

    const profile = profiles.filter((prof) => prof.hotkey === key)[0];
    if (!profile) return true;
    copyTags(profile.profileName);

    return false;
});

$(document).ready(() => {
    switch (window.location.hostname) {
        case  "danbooru.donmai.us":
        case "safebooru.donmai.us":
        case  "hijiribe.donmai.us":
        case  "sonohara.donmai.us":
        case "testbooru.donmai.us":
            queries = [
                "#tag-list a.search-tag",
                "#tag-list li:not(.category-0):not(.category-5) a.search-tag",
            ];
            addButtons({
                container: "#tag-list",
                css: { margin: "0 4px 0 0" },
            });
            break;
        case "chan.sankakucomplex.com":
        case "idol.sankakucomplex.com":
            queries = [
                "#tag-sidebar li a[href^='/?tags']",
                "#tag-sidebar li:not(.tag-type-medium):not(.tag-type-general) a[href^='/?tags']",
            ];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar) h5",
                css: { margin: "0 4px 0 0" },
                inserting: "append",
            });
            break;
        case "beta.sankakucomplex.com":
            queries = [
                "a[href^='/tag/']",
                // no support due dynamic CSS classes
            ];
            addButtons({
                container: "span:contains('Tags'):not([class])",
                fullOnly: true,
                css: { margin: "0 0 -3px 4px" },
                inserting: "append",
                color: "white",
            });
            break;
        case "lolibooru.moe":
        case "konachan.com":
        case "konachan.net":
        case "yande.re":
        case "e621.net":
        case "e921.net":
            queries = [
                "#tag-sidebar li a[href^='/post']",
                `#tag-sidebar
                    li:not(.tag-type-general):not(.tag-type-species):not(.tag-type-style)
                        a[href^='/post']`,
            ];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar)",
                color: "white",
            });
            break;
        case "art.4otaku.org":
            if (!isPath(/^\/\d+/)) break;
            queries = [
                "span.count + a.tag",
                "span.count + a.tag[style]",
            ];
            addButtons({
                container: ".sidebar_part:has(.count)",
                subContainer: "<div class='sidebar_row' style='height:20px;'>",
                reversed: true,
                css: { float: "right" },
            });
            break;
        case "anime-pictures.net":
            queries = [
                "#post_tags a",
                "#post_tags a.big_tag",
            ];
            addButtons({
                container: "#tags_sidebar .title",
                inserting: "append",
                reversed: true,
                css: {
                    display: "inline-block",
                    margin: "8px 0px 0 12px",
                    float: "right",
                },
                color: "white",
            });
            break;
        case "www.pixiv.net":
            if (
                !isPath("/member.php")
                && (!isPath("/member_illust.php") || !isSearch(/^\?mode=medium&illust_id=(\d+)/))
                && !isPath(/^(\/\w\w)?\/artworks\/\d+/)
            ) {
                break;
            }
            queries = [
                `.ex-artist-tag,
                 aside > section > div:first-child > div > a,
                 figcaption footer a`,
            ];
            addButtons({
                container: "figcaption footer li:last-child",
                fullOnly: true,
                css: {
                    height: "14px",
                    width: "14px",
                    verticalAlign: "-3px",
                    marginLeft: "5px",
                },
                inserting: "append",
                color: "#3d7699",
            });
            break;
        case "gelbooru.com":
            if (!isPath("/index.php") || !isSearch(/^\?page=post&s=view&id=(\d+)/)) break;
            queries = [
                "#tag-list a[href*='page=post']",
                `#tag-list .tag-type-copyright a[href*='page=post'],
                 #tag-list .tag-type-character a[href*='page=post'],
                 #tag-list .tag-type-artist a[href*='page=post']`,
            ];
            addButtons({
                container: "#tag-list > div",
            });
            break;
        case "e-shuushuu.net":
            queries = [
                ".meta .quicktag a",
                ".meta .quicktag:gt(0) a",
            ];
            addButtons({
                container: ".title a",
                inserting: "after",
                css: {
                    margin: "0 1px 0 5px",
                    top: "1px",
                    position: "relative",
                },
                color: "#16466C",
            });
            break;
        case "www.zerochan.net":
            if (!isPath(/^\/\d+/)) break;
            queries = [
                "#tags a",
                "#tags a",
            ];
            addButtons({
                container: "#menu h2:eq(1)",
                css: {
                    margin: "0 2px",
                    float: "left",
                },
                color: "#439",
            });
            break;
        case "seiga.nicovideo.jp":
            queries = [
                `.ex-artist-tag,
                .user_name:first strong,
                .illust_tag:first li.tag > a,
                .lg_box_tag a`,
            ];
            addButtons({
                container: ".lg_box_tag, .illust_tag:first",
                css: {
                    float: "left",
                    margin: "4px 6px 0 0",
                },
                fullOnly: true,
            });
            break;
        case "safebooru.org":
            if (!isPath("/index.php") || !isSearch(/^\?page=post&s=view&id=(\d+)/)) break;
            queries = [
                "#tag-sidebar a",
                "#tag-sidebar li:not(.tag-type-general) a",
            ];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar) h5",
                css: { margin: "6px 6px 0 0" },
            });
            break;
        case "nozomi.la":
            if (!isPath(/^\/post\//)) return;
            queries = [
                ".sidebar a",
                ".sidebar a:not(.tag)",
            ];
            addButtons({
                container: ".sidebar",
                subContainer: "<p>",
                css: { margin: "0 0 0 10px" },
            });
            break;
        default: console.error("An unsupported domain", window.location.hostname);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.method) {
        case "copyTags":
            copyTags(request.profile);
            showMsg(chrome.i18n.getMessage("content_msg_all_tags_copied") + request.profile);
            break;
        case "copyLinkTitle": break; // for copy link title.js
        default: console.error("Unknown method, request:", request);
    }
});
