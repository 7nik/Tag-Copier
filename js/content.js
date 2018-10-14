/*jshint esversion: 6 */
let profiles = [];
let queries;

function copyTags(profileName) {
    db.getProfile(profileName)
        .then(profile => db.getTagReplacing(profileName)
            .then(tagReplacing => {
                let replaceTag = (elem) => tagReplacing.hasOwnProperty(elem.toLowerCase()) ? tagReplacing[elem.toLowerCase()] : elem;
                let tags = $(queries[(profile.copyrightsOnly == true) ? 1 : 0]);
                tags = Array.from(tags)
                    .map((elem) => replaceTag(
                        (profile.tagPrefix + replaceTag(elem.firstNode ? elem.firstNode.textContent : elem.innerText))
                        .replace(/\s/g, profile.wordDelimeter)))
                    .filter((elem) => elem && (elem !== "+") && (elem !== "–"))
                    .join(profile.tagDelimeter);
                if (profile.lowerCase) {
                    tags = tags.toLowerCase();
                }
                if (!tags) {
                    showMsg(chrome.i18n.getMessage("content_msg_nothing_copied") + profileName);
                    return;
                }

                $(document).one("copy", (e) => (e.originalEvent.clipboardData.setData("text/plain", tags), false));
                document.execCommand("Copy", false, null);

                showMsg(chrome.i18n.getMessage("content_msg_tags_copied") + profileName);
            })
        );
    return false;
}

function showMsg(msg) {
    const $container = $("<center>")
        .css({
            position: "fixed",
            top: "49%",
            left: "45%",
        })
        .append(
           $("<h3>")
            .css({
                background: "rgba(0,0,0,0.8)",
                color: "white",
                margin: "0",
                padding: "3px 10px",
                borderRadius: "5px",
                boxShadow: "0 0 10px 3px black",
            })
            .text(msg)
        )
        .appendTo("body");
    setTimeout(() => $container.animate({opacity: 0}, 2000, () => $container.remove()), 2000);
}

/*
    options = {
        css: {height: "16px", width: "16px", margin: "0 6px 0 0", cursor: "pointer"}, // the css applied to the buttons
        fullOnly: false, // if true - add only buttons which copy all tags
        reversed: false, // if true - add the buttons in the reversed order
        container: string, // selector for element in which the buttons will be added
        subContainer: string(html), // container for the buttons
        inserting: "prepend", // name of function for insertion
        color: string, // color of the buttons, default - black
    }
*/
function addButtons(options) {
    options.css = $.extend({height: "16px", width: "16px", margin: "0 6px 0 0", cursor: "pointer"}, options.css);
    let buttons = profiles.filter(p => p.buttonName);
    if (options.fullOnly) {
        buttons = buttons.filter((p) => !p.copyrightsOnly);
    }
    if (options.reversed) {
        buttons.reverse();
    }
    let $buttons = buttons.reduce((buttons, p) => buttons.add($(`
        <svg profile="${p.profileName}" copyrightsonly="${p.copyrightsOnly}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" id="icon_all_tags">
            <path d="M 0 320 Q 0 192 128 192 h 576 Q 832 192 832 320 v 576 Q 832 1024 704 1024 h -576 Q 0 1024 0 896 v -576 h 64 v 576 Q 64 960 128 960 h 576 Q 768 960 768 896 v -576 Q 768 256 704 256 h -576 Q 64 256 64 320 Z"></path>
            <path d="M 192 128 Q 192 0 320 0 h 576 Q 1024 0 1024 128 v 576 Q 1024 832 896 832 v -64 Q 960 768 960 704 v -576 Q 960 64 896 64 h -576 Q 256 64 256 128 Z"></path>
            <text x="416" y="680" style="alignment-baseline: middle; text-anchor: middle; font: ${1280 / (p.buttonName.length+1)}px Arial; ">${p.buttonName}</text>
        </svg>`)), $());
    $buttons.css(options.css);
    if (options.color) {
        $buttons.children().attr("fill", options.color);
    }
    $buttons.click(function (e) { copyTags(this.getAttribute("profile"), this.getAttribute("copyrightsonly")); });
    if (options.subContainer) {
        $buttons = $(options.subContainer).append($buttons);
    }
    let n = 0;
    let add = () => {
        let c = $(options.container);
        if (n > 100) {
            console.warn("error of adding of buttons");
            return;
        }
        if (c.length) {
            c[options.inserting || "prepend"]($buttons);
        } else {
            n++;
            setTimeout(add, 300);
        }
    };
    add();
}

db.get("profileNames", [])
    .then(pns => {
        let fields = {};
        pns.forEach(pn => fields["profile:"+pn] = {});
        return db.get(fields);
    })
    .then(ps => {
        profiles = Object.values(ps);
    });

$(document).keydown(function (e) {
    let key = "";
    if (event.ctrlKey) key += "Ctrl+";
    if (event.altKey) key += "Alt+";
    if (event.shiftKey) key += "Shift+";
    key += (e.key.length > 1) ? e.key : String.fromCharCode(e.which || e.keyCode);

    let ps = profiles.filter(p => p.hotkey === key);
    if (ps.length === 0) return;
    copyTags(ps[0].profileName);

    return false;
});

$(document).ready(function () {
    switch (window.location.hostname) {
        case  "danbooru.donmai.us":
        case "safebooru.donmai.us":
        case  "hijiribe.donmai.us":
        case  "sonohara.donmai.us":
        case "testbooru.donmai.us":
            queries = ["#tag-list a.search-tag", "#tag-list li:not(.category-0):not(.category-5) a.search-tag"];
            addButtons({
                container: "#tag-list",
                css: {margin: "0 4px 0 0"},
            });
            break;
        case "chan.sankakucomplex.com":
        case "idol.sankakucomplex.com":
            queries = ["#tag-sidebar li a[href^='/?tags']", "#tag-sidebar li:not(.tag-type-medium):not(.tag-type-general) a[href^='/?tags']"];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar) h5",
                inserting: "before",
                css: { margin: "0 4px 0 0"},
            });
            break;
        case "lolibooru.moe":
        case "konachan.com":
        case "konachan.net":
        case "yande.re":
        case "e621.net":
        case "e921.net":
            queries = ["#tag-sidebar li a[href^='/post']", "#tag-sidebar li:not(.tag-type-general):not(.tag-type-species) a[href^='/post']"];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar)",
                color: "white",
            });
            break;
        case "art.4otaku.org":
            if (!window.location.pathname.match("^/(\\d+)")) break;
            queries = ["span.count + a.tag", "span.count + a.tag[style]"];
            addButtons({
                container: ".sidebar_part:has(.count)",
                subContainer: "<div class='sidebar_row' style='height:20px;'>",
                reversed: true,
                css: {float: "right"},
            });
            break;
        case "anime-pictures.net":
            queries = ["#post_tags a", "#post_tags a.big_tag"];
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
            if ((window.location.pathname !== "/member.php") && ((window.location.pathname !== "/member_illust.php") || !window.location.search.match("^\\?mode=medium&illust_id=(\\d+)"))) break;
            queries = [".ex-artist-tag a, aside > section > div:first-child > div > a, figcaption footer a"];
            addButtons({
                container: "figcaption footer li:last-child",
                fullOnly: true,
                css: {
                    height: "14px",
                    width: "14px",
                    verticalAlign: "-3px",
                    marginRight: "5px",
                },
                color: "#3d7699",
            });
            break;
        case "gelbooru.com":
            if ((window.location.pathname !== "/index.php") || !window.location.search.match("^\\?page=post&s=view&id=(\\d+)")) break;
            queries = ["#tag-list a[href*='page=post']", "#tag-list .tag-type-copyright a[href*='page=post'], #tag-list .tag-type-character a[href*='page=post'], #tag-list .tag-type-artist a[href*='page=post']"];
            addButtons({
                container: "#tag-list > div",
            });
            break;
        case "e-shuushuu.net":
            queries = [".meta .quicktag a", ".meta .quicktag:gt(0) a"];
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
            if (!window.location.pathname.match("^/(\\d+)")) break;
            queries = ["#tags a", "#tags a"];
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
            queries = [".ex-artist-tag, .user_name:first strong, .illust_tag:first li.tag > a, .lg_box_tag a"];
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
            if ((window.location.pathname !== "/index.php") || !window.location.search.match("^\\?page=post&s=view&id=(\\d+)")) break;
            queries = ["#tag-sidebar a", "#tag-sidebar li:not(.tag-type-general) a"];
            addButtons({
                container: ".sidebar div:has(#tag-sidebar) h5",
                css: {margin: "6px 6px 0 0"},
            });
            break;
        default: console.error("An unsupported domain", window.location.hostname);
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.method) {
            case "copyTags":
                copyTags(request.profile);
                showMsg(chrome.i18n.getMessage("content_msg_all_tags_copied") + request.profile);
                break;
            case "copyLinkTitle": break;
            default: console.error("Unknown method, request:", request);
        }
    });
});

