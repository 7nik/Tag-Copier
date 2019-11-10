/* eslint-env webextensions */
/* global db */
/* eslint-disable no-alert, sonarjs/no-duplicate-string */

"use strict";

let settings = {};

db.logError = function logError2 (error) {
    alert(chrome.i18n.getMessage("settings_db_fail"));
    throw error;
};

function saveOptions (id, value) {
    switch (id) {
        case "currentProfileName":
            if (settings.currentProfileName === value) return;
            settings.currentProfileName = value;
            db.set("currentProfileName", value);
            break;
        case "tagReplacing":
            db.setTagReplacing(settings.currentProfileName, value || settings.tagReplacing);
            break;
        default:
            console.error("Saving of unknown field:", id, value);
    }
}

function restoreOptions () {
    const options = {
        profileNames:       ["AP add"],
        currentProfileName: "AP add",
    };
    db.get(options).then((items) => {
        settings = items;
        $("#profileNames")
            .html(
                items.profileNames
                    .map((profileName) => `<option value="${profileName}">${profileName}</option>`)
                    .join(""),
            )
            .val(items.currentProfileName);
        loadProfile();
    });
}

function addTagReplacing () {
    settings.tagReplacing[$("#replaceableTag").val()] = $("#substituteTag").val();
    saveOptions("tagReplacing");
    $("#replaceableTag, #substituteTag").val("");
    showTag();
}

function removeTag () {
    const tagName = $("#replaceableTag2").text();
    delete settings.tagReplacing[tagName];
    saveOptions("tagReplacing");
    $("#replaceableTag, #substituteTag").val("");
    showTag();
}

function loadProfile () {
    saveOptions("currentProfileName", $("#profileNames").val());
    db.getProfile(settings.currentProfileName)
        .then((profile) => {
            settings.currentProfile = profile;
        });
    db.getTagReplacing(settings.currentProfileName)
        .then((data) => {
            settings.tagReplacing = data;
        });
}

function showTag () {
    const tag = $("#replaceableTag").val();
    if (tag in settings.tagReplacing) {
        $("#replaceableTag2").text(tag);
        $("#substituteTag2").text(settings.tagReplacing[tag]);
        $("table tr:last").css("visibility", "visible");
    } else {
        $("table tr:last").css("visibility", "hidden");
    }
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
    $("#addTagReplacing").on("click", addTagReplacing);
    $("#profileNames").on("change", loadProfile);
    $("#replaceableTag, #substituteTag").on("keypress", (ev) => {
        if (ev.originalEvent.key === "Enter") addTagReplacing();
    });
    $("#replaceableTag, #substituteTag").on("input", showTag);
    $("#removeTag").on("click", removeTag);

    $("#replaceableTag").focus();
});
