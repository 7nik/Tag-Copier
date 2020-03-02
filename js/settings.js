/* eslint-env webextensions */
/* global db */
/* eslint-disable no-alert, sonarjs/no-duplicate-string */

"use strict";

let settings = {};
const elemsType = {
    // t - text, k - hotkey, b - boolean, n - number,
    // o - object, a - array, "-" - special handler
    tagPrefix:           "t",
    tagDelimeter:        "t",
    wordDelimeter:       "t",
    lowerCase:           "b",
    copyrightsOnly:      "b",
    allTagsOtherwise:    "b",
    buttonName:          "t",
    contextMenu:         "b",
    hotkey:              "t",
    profileName:         "-",

    profileNames:        "a",
    currentProfileName:  "-",
    tagReplacing:        "o",
    copyLinkTitle:       "b",
};

const copyLinkTitlePermissions = {
    permissions: ["tabs", "activeTab"],
    origins: ["<all_urls>"],
};

db.logError = function logError2 (error) {
    alert(chrome.i18n.getMessage("settings_db_fail"));
    throw error;
};

function saveOptions (id, value) {
    let method;
    switch (id) {
        case "copyLinkTitle":
            if (value === true) {
                // calling of chrome.permissions.contains makes FF think it isn't a user input handler?
                // chrome.permissions.contains(copyLinkTitlePermissions, (has) => {
                //     if (has) {
                //         chrome.runtime.sendMessage({ method: "enableLinkTitle" });
                //         db.set(id, value);
                //     } else {
                        chrome.permissions.request(copyLinkTitlePermissions, (granted) => {
                            if (!granted) {
                                setText(id, false);
                                return;
                            }
                            chrome.runtime.sendMessage({ method: "enableLinkTitle" });
                            db.set(id, value);
                        });
                //     }
                // });
            } else {
                chrome.permissions.remove(copyLinkTitlePermissions);
                chrome.runtime.sendMessage({ method: "disableLinkTitle" });
                db.set(id, value);
            }
            return;
        case "currentProfileName":
        case "profileNames":
            if (settings[id] === value) return;
            settings[id] = value;
            db.set(id, value);
            break;
        case "tagReplacing":
            db.setTagReplacing(settings.currentProfileName, value || settings.tagReplacing);
            setText(id, value || settings.tagReplacing);
            return;
        // profile's field
        case "contextMenu":
            method = value ? "showCopyTags" : "hideCopyTags";
        // fallthrough
        case "copyrightsOnly":
        case "allTagsOtherwise": {
            if (!method) method = "updateCopyTags";
            settings.currentProfile[id] = value;
            const { copyrightsOnly, allTagsOtherwise } = settings.currentProfile;
            chrome.runtime.sendMessage({
                method,
                title: settings.currentProfileName,
                copyrightsOnly: copyrightsOnly && !allTagsOtherwise,
            });
            db.setProfile(settings.currentProfileName, settings.currentProfile);
            break;
        }
        case "tagPrefix":
        case "tagDelimeter":
        case "wordDelimeter":
        case "lowerCase":
        case "buttonName":
        case "hotkey":
            if (settings.currentProfile[id] === value) return;
            settings.currentProfile[id] = value;
            db.setProfile(settings.currentProfileName, settings.currentProfile);
            break;
        default:
            console.error("Saving of unknown field:", id, value);
    }
    setText(id, value);
}

function restoreOptions () {
    const options = {
        profileNames:       ["AP add"],
        currentProfileName: "AP add",
        copyLinkTitle:      false,
    };
    db.get(options)
        .then((items) => {
            settings = items;
            Object.entries(settings).forEach(([id, value]) => setText(id, value));
            $("#profileNames").val(settings.currentProfileName);
            loadProfile();
        });
}

function setText (id, value) {
    const type = elemsType[id];
    switch (type) {
        case "b":
            $(`#${id}`).prop("checked", value);
            if (id === "copyrightsOnly") {
                $("#allTagsOtherwise").prop("disabled", !value);
            }
            break;
        case "t":
        case "n":
            $(`#${id}`).val(value);
            break;
        case "o": {
            const html = Object
                .keys(value)
                .map((k) => `
                    <tr class="tag">
                        <td>${k}</td>
                        <td>${value[k]}</td>
                        <td><button>-</button></td>
                    </tr>
                `)
                .join("");
            $(".tag").remove();
            $(`#${id}`).after(html);
            $(".tag").find("button").click(removeTag);
            break;
        }
        case "a":
            $(`#${id}`).html(value.map((v) => `<option value="${v}">${v}</option>`).join(""));
            break;
        case "-": break;
        default:
            console.warn("Unknown type:", id, type);
    }
}

function onchange () {
    const type = elemsType[this.id];
    switch (type) {
        case "n": saveOptions(this.id, +$(this).val()); break;
        case "b": saveOptions(this.id, $(this).prop("checked")); break;
        case "t": saveOptions(this.id, $(this).val()); break;
        case "k": break;
        // no default
    }
}

function deleteHotKey () {
    if (!window.confirm(chrome.i18n.getMessage("settings_confirm_hotkey_deleteing"))) return;
    saveOptions("hotkey", "");
    $("#cancel").click();
}

function showChooser () {
    const { hotkey } = settings.currentProfile;
    $(document).on("keydown", keypress);
    $("#bg").css("display", "flex");
    $("#shift").prop("checked", hotkey.includes("Shift+"));
    $("#ctrl").prop("checked", hotkey.includes("Ctrl+"));
    $("#alt").prop("checked", hotkey.includes("Alt+"));
    $("#key").text(hotkey.replace(/\w+\+/g, ""));
}

function hideChooser (ev) {
    if (!$(ev.target).is("#bg,#ok,#cancel")) return;
    $(document).off("keydown", keypress);
    $("#bg").css("display", "none");
    if (this.id === "ok") {
        let hotkey = "";
        if ($("#ctrl").prop("checked"))  hotkey += "Ctrl+";
        if ($("#alt").prop("checked"))   hotkey += "Alt+";
        if ($("#shift").prop("checked")) hotkey += "Shift+";
        hotkey += $("#key").text();

        saveOptions("hotkey", hotkey);
    }
}

function keypress (ev) {
    if (ev.key === "Escape") {
        $("#cancel").click();
        return true;
    }
    if (ev.ctrlKey) {
        $("#ctrl").click();
        return false;
    }
    if (ev.altKey) {
        $("#alt").click();
        return false;
    }
    if (ev.shiftKey) {
        $("#shift").click();
        return false;
    }
    $("#key").text((ev.key.length > 1) ? ev.key : String.fromCharCode(ev.which || ev.keyCode));
    return false;
}

function addTagReplacing () {
    settings.tagReplacing[$("#replaceableTag").val()] = $("#substituteTag").val();
    saveOptions("tagReplacing");
    $("#replaceableTag, #substituteTag").val("");
}

function removeTag () {
    const tagName = $(this).closest("tr").find("td:eq(0)").text();
    delete settings.tagReplacing[tagName];
    $(this).closest("tr").remove();
    saveOptions("tagReplacing");
}

function loadProfile () {
    saveOptions("currentProfileName", $("#profileNames").val());
    db.getProfile(settings.currentProfileName)
        .then((profile) => {
            settings.currentProfile = profile;
            Object.entries(profile).forEach(([id, value]) => setText(id, value));
        });
    db.getTagReplacing(settings.currentProfileName)
        .then((data) => {
            settings.tagReplacing = data;
            setText("tagReplacing", data);
        });
}

function addProfile () {
    const profileName = prompt(chrome.i18n.getMessage("settings_enter_profile_name"), "my profile");
    if (profileName === null) return;
    if (settings.profileNames.includes(profileName)) {
        alert(chrome.i18n.getMessage("settings_profile_already_exsists"));
        return;
    }

    settings.profileNames.push(profileName);
    settings.currentProfileName = profileName;
    settings.currentProfile.profileName = profileName;
    const options = {
        profileNames: settings.profileNames,
        currentProfileName: profileName,
    };
    db.set(options);
    db.setProfile(profileName, settings.currentProfile);
    db.setBO(`tagReplacing:${settings.currentProfileName}`, settings.tagReplacing);
    if (settings.currentProfile.contextMenu) {
        chrome.runtime.sendMessage({ method: "showCopyTags", title: settings.currentProfileName });
    }

    $("#profileNames")
        .append(`<option value="${profileName}">${profileName}</option>`)
        .val(profileName);
}

function removeProfile () {
    if (!window.confirm(chrome.i18n.getMessage("settings_confirm_profile_deleteing"))) return;
    const profileName = settings.currentProfileName;
    settings.profileNames = settings.profileNames.filter((pname) => pname !== profileName);
    db.removeProfile(profileName);
    chrome.runtime.sendMessage({ method: "hideCopyTags", title: profileName });
    $(`#profileNames option[value="${profileName}"`).remove();

    loadProfile();
}

function localizeHtmlPage () {
    document.title = chrome.i18n.getMessage("settings_title") || document.title;
    // Localize by replacing __MSG_***__ meta tags
    const page = $("body");
    const original = page.html();
    const localized = original.replace(
        /__MSG_(\w+)__/g,
        (match, msg) => (msg ? chrome.i18n.getMessage(msg) : ""),
    );
    if (original !== localized) {
        page.html(localized);
    }
}

$(document).ready(() => {
    localizeHtmlPage();
    restoreOptions();
    Object.entries(elemsType).forEach(([elem, type]) => {
        if (type === "k") return;
        $(`#${elem}`).on("change", onchange);
    });
    $("#changeHotkey").on("click", showChooser);
    $("#bg, #ok, #cancel").on("click", hideChooser);
    $("#addTagReplacing").on("click", addTagReplacing);
    $("#profileNames").on("change", loadProfile);
    $("#addProfile").on("click", addProfile);
    $("#removeProfile").on("click", removeProfile);
    $("#deleteHotkey").on("click", deleteHotKey);
    $("#replaceableTag, #substituteTag").on("keypress", (ev) => {
        if (ev.originalEvent.key === "Enter") addTagReplacing();
    });
});
