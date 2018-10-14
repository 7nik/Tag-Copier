/*jshint esversion: 6 */
let settings = {};

db.logError = function (error) {
    alert(chrome.i18n.getMessage("settings_db_fail"));
    throw error;
};

function saveOptions(id, value) {
    switch (id) {
        case "currentProfile":
            if (settings[id] == value) return;
            if (value === undefined) {
                value = settings[id];
            } else {
                settings[id] = value;
            }
            settings[id] = value;
            db.set("currentProfile", value);
            break;
        case "tagReplacing":
            db.setTagReplacing(settings.currentProfile, value || settings.tagReplacing);
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
    };
    db.get(options)
        .then((items) => {
            settings = items;
            $("#profileNames")
                .html(items.profileNames
                    .map((profile) => `<option value="${profile}">${profile}</option>`)
                    .join("")
                )
                .val(items.currentProfile);
            loadProfile();
        });
}

function addTagReplacing() {
    settings.tagReplacing[$("#replaceableTag").val()] = $("#substituteTag").val();
    saveOptions("tagReplacing");
    $("#replaceableTag, #substituteTag").val("");
}

function removeTag() {
    let tagName = $(this).closest("tr").find("td").eq(0).text();
    delete settings.tagReplacing[tagName];
    saveOptions("tagReplacing");
    showTag();
}

function loadProfile() {
    saveOptions("currentProfile", $("#profileNames").val());
    db.getProfile(settings.currentProfile)
        .then(p => settings.profile = p);
    db.getTagReplacing(settings.currentProfile)
        .then(tr => settings.tagReplacing = tr);
}

function showTag() {
    let tag = $("#replaceableTag").val();
    if (settings.tagReplacing[tag] === undefined) {
        $("table tr:last").css("visibility", "hidden");
    } else {
        $("#replaceableTag2").text(tag);
        $("#substituteTag2").text(settings.tagReplacing[tag]);
        $("table tr:last").css("visibility", "visible");
    }
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
    $("#addTagReplacing").on("click", addTagReplacing);
    $("#profileNames").on("change", loadProfile);
    $("#replaceableTag, #substituteTag").on("keypress", (e) => (e.originalEvent.key === "Enter") && addTagReplacing() || true);
    $("#replaceableTag, #substituteTag").on("input", showTag);
    $("#removeTag").on("click", removeTag);

    $("#replaceableTag").focus();
});