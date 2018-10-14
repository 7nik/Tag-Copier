/*jshint esversion: 6 */

let settings = {};
let elemsType = {
    // t - text, k - hotkey, b - boolean (checked), n - number, o - object, a - array, "-" - special handler
    tagPrefix:           't',
    tagDelimeter:        't',
    wordDelimeter:       't',
    lowerCase:           'b',
    copyrightsOnly:      'b',
    buttonName:          't',
    contextMenu:         'b',
    hotkey:              't',
    profileName:         '-',

    profileNames:        'a',
    currentProfile:      '-',
    tagReplacing:        'o',
    copyLinkTitle:       'b',
};

db.logError = function (error) {
    alert(chrome.i18n.getMessage("settings_db_fail"));
    throw error;
};

function saveOptions(id, value) {
    switch (id) {
        case "copyLinkTitle":
            chrome.runtime.sendMessage({
                method:  value ? "enableLinkTitle" : "disableLinkTitle",
            });
        case "currentProfile":
        case "profileNames":
            if (settings[id] == value) return;
            if (value === undefined) {
                value = settings[id];
            } else {
                settings[id] = value;
            }
            db.set(id, value).then(() => setText(id, value));
            break;
        case "tagReplacing":
            db.getTagReplacing(settings.currentProfile, value || settings.tagReplacing);
            break;
        // profile's field
        case "contextMenu":
            chrome.runtime.sendMessage({
                method:  value ? "showCopyTags" : "hideCopyTags",
                title: settings.currentProfile,
                copyrightsOnly: settings.profile.copyrightsOnly,
            });
        case "tagPrefix":
        case "tagDelimeter":
        case "wordDelimeter":
        case "lowerCase":
        case "copyrightsOnly":
        case "buttonName":
        case "hotkey":
            if (settings.profile[id] == value) return;
            if (value === undefined) {
                value = settings.profile[id];
            } else {
                settings.profile[id] = value;
            }
            db.setProfile(settings.currentProfile, settings.profile)
                .then(() => setText(id, value));
            break;
        default:
            console.error("Saving of unknown field:", id, value);
            return;
    }
}

function restoreOptions() {
    let options = {
        profileNames:       ["AP add"],
        currentProfile:     "AP add",
        copyLinkTitle:      true,
    };
    db.get(options)
        .then((items) => {
            settings = items;
            for (let id in settings) setText(id, settings[id]);
            $("#profileNames").val(settings.currentProfile);
            loadProfile();
        });
}

function setText(id, value) {
    const type = elemsType[id];
    switch (type) {
        case 'b':
            $("#"+id).prop("checked", value);
            break;
        case 't':
        case 'n':
            $("#"+id).val(value);
            break;
        case 'o':
            let html = Object.keys(value).map((k) => `<tr class="tag"><td>${k}</td><td>${value[k] || "<i></i>"}<br></td><td><button>-</button></td></tr>`).join("");
            $(".tag").remove();
            $("#"+id).after(html);
            $(".tag").find("button").click(removeTag);
            break;
        case 'a':
            $("#"+id).html(value.map((t) => `<option value="${t}">${t}</option>`).join(""));
            break;
        case '-': break;
        default:
            console.warn("Unknown type: ", id, type);
            $("#"+id).text(value);
    }
}

function onchange() {
    let type = elemsType[this.id];
    switch (type) {
        case 'n': saveOptions(this.id, +$(this).val()); break;
        case 'b': saveOptions(this.id, $(this).prop("checked")); break;
        case 't': saveOptions(this.id, $(this).val()); break;
        case 'k': break;
    }
}

function deleteHotKey(e) {
    if (!confirm(chrome.i18n.getMessage("settings_confirm_hotkey_deleteing"))) return;
    saveOptions("hotkey", "");
    $("#cancel").click();
}

function showChooser() {
    let hotkey = settings.profile.hotkey;
    $(document).on("keydown", keypress);
    $("#bg").css("display", "flex");
    $("#shift").prop("checked", (hotkey.indexOf("Shift+") >= 0) ? true : false);
    $("#ctrl" ).prop("checked", (hotkey.indexOf("Ctrl+") >= 0) ? true : false);
    $("#alt"  ).prop("checked", (hotkey.indexOf("Alt+") >= 0) ? true : false);
    $("#key").text(hotkey.replace(/\w+\+/g, ""));
}

function hideChooser(e) {
    if (!$(e.target).is("#bg,#ok,#cancel")) return;
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

function keypress(e) {
    if (e.key === "Escape") {
        $("#cancel").click();
        return;
    }
    if (event.ctrlKey) {
        $("#ctrl").click();
        return false;
    }
    if (event.altKey) {
        $("#alt").click();
       return false;
    }
    if (event.shiftKey) {
        $("#shift").click();
       return false;
    }
    $("#key").text((e.key.length > 1) ? e.key : String.fromCharCode(e.which || e.keyCode));
    return false;
}

function addTagReplacing() {
    settings.tagReplacing[$("#replaceableTag").val()] = $("#substituteTag").val();
    saveOptions("tagReplacing");
    $("#replaceableTag, #substituteTag").val("");
}

function removeTag() {
    let tagName = $(this).closest("tr").find("td").eq(0).text();
    delete settings.tagReplacing[tagName];
    $(this).closest("tr").remove();
    saveOptions("tagReplacing");
}

function loadProfile() {
    saveOptions("currentProfile", $("#profileNames").val());
    db.getProfile(settings.currentProfile)
        .then(p => { for (let id in settings.profile = p) setText(id, p[id]); });
    db.getTagReplacing(settings.currentProfile)
        .then(tr => setText("tagReplacing", settings.tagReplacing = tr));
}

function addProfile() {
    const profileName = prompt(chrome.i18n.getMessage("settings_enter_profile_name"), "new profile");
    if (profileName === null) return;
    if (settings.profileNames.indexOf(profileName) >= 0) {
        alert(chrome.i18n.getMessage("settings_profile_already_exsists"));
        return;
    }

    settings.profileNames.push(profileName);
    settings.currentProfile = profileName;
    settings.profile.profileName = profileName;
    let options = {
        profileNames: settings.profileNames,
        currentProfile: profileName,
    };
    db.set(options);
    db.setProfile(profileName, settings.profile);
    db.setBO("tagReplacing:"+settings.currentProfile, settings.tagReplacing);
    if (settings.profile.contextMenu) {
        chrome.runtime.sendMessage({method: "showCopyTags", title: settings.currentProfile});
    }

    $("#profileNames").append(`<option value="${profileName}">${profileName}</option>`).val(profileName);
}

function removeProfile() {
    if (!confirm(chrome.i18n.getMessage("settings_confirm_profile_deleteing"))) return;
    let pn = settings.currentProfile;
    settings.profileNames = settings.profileNames.filter((p) => p !== pn);
    db.removeProfile(pn);
    chrome.runtime.sendMessage({method: "hideCopyTags", title: pn});
    $(`#profileNames option[value="${pn}"`).remove();

    loadProfile();
}

function localizeHtmlPage() {
    document.title = chrome.i18n.getMessage("settings_title") || document.title;
    //Localize by replacing __MSG_***__ meta tags
    let page = $("body");
    let original = page.html();
    let localized = original.replace(/__MSG_(\w+)__/g, function(match, msg) {
        return msg ? chrome.i18n.getMessage(msg) : "";
    });
    if (original !== localized) {
        page.html(localized);
    }
}

$(document).ready(function () {
    localizeHtmlPage();
    restoreOptions();
    for (let elem in elemsType) {
        if (elemsType[elem] !== 'k') {
            $("#" + elem).on("change input", onchange);
        }
    }
    $("#changeHotkey").on("click", showChooser);
    $("#bg, #ok, #cancel").on("click", hideChooser);
    $("#addTagReplacing").on("click", addTagReplacing);
    $("#profileNames").on("change", loadProfile);
    $("#addProfile").on("click", addProfile);
    $("#removeProfile").on("click", removeProfile);
    $("#deleteHotkey").on("click", deleteHotKey);
    $("#replaceableTag, #substituteTag").on("keypress", (e) => (e.originalEvent.key === "Enter") && addTagReplacing() || true);
});