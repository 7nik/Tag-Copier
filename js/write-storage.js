/* eslint-env webextensions */
/* global db */

"use strict";

if (!db) console.error("No db");

/**
 * Save one or more records to DB
 * @param {string, object} fields - name of single saving record or
 * object with keys=record names and values=saving values
 * @param {*} [value] - value of the single saving record
 */
db.set = function dbSet (fields, value) {
    const data = (typeof fields !== "object")
        ? { [fields.toString()]: value }
        : fields;
    return this.doStorage("set", data);
};

/**
 * Save big object that can cause error "QUOTA_BYTES_PER_ITEM quota exceeded"
 * @param {string} key - name of the object
 * @param {*} value - saving object
 */
db.setBO = function dbSetBO (key, value) {
    const fields = {};
    const limit = this.storage.QUOTA_BYTES_PER_ITEM - key.length - 25;
    let json = JSON.stringify(value);
    let len = limit;
    let i = 0;
    while (json.length > 0) {
        let part = json.slice(0, len);
        while (JSON.stringify(part).length > limit) {
            len -= 100;
            part = json.slice(0, len);
        }
        fields[`${key}_${i}`] = part;
        json = json.slice(len);
        i += 1;
    }
    fields[`${key}_length`] = i;
    return this.set(fields);
};

/**
 * Safe save profile
 * @param {string} profileName - name of the profile
 * @param {object} profile - profile
 */
db.setProfile = function dbSetProfile (profileName, profile) {
    const fullProfile = {
        tagPrefix:      "#",
        tagDelimeter:   " ",
        wordDelimeter:  "",
        lowerCase:      false,
        copyrightsOnly: true,
        buttonName:     "#",
        contextMenu:    false,
        hotkey:         "",
        profileName,
        ...profile,
    };
    return this.set(`profile:${profileName}`, fullProfile);
};

/**
 * Save tags for ragplacing
 * @param {string} profileName - name of the profile
 * @param {object} tagReplacing - the tags
 */
db.setTagReplacing = function dbSetTagReplacing (profileName, tagReplacing) {
    return this.setBO(`tagReplacing:${profileName}`, tagReplacing);
};

/**
 * Remove record(s) from DB
 * @param {string,arrays} fields - name(s) of removing record(s)
 */
db.remove = function remove (fields) {
    let data = fields;
    if (!Array.isArray(fields)) {
        data = [fields.toString()];
    }
    return this.doStorage("remove", data);
};

/**
 * Remove big record from DB
 * @param {string} key - name of removing record
 */
db.removeBO = async function dbRemoveBO (key) {
    const length = this.get(`${key}_length`);
    const list = [`${key}_length`];
    for (let i = 0; i < length; i++) {
        list.push(`${key}_${i}`);
    }
    return this.remove(list);
};

/**
 * Remove tags for replacing from DB
 * @param {string} profileNames - name of profile using these tags
 */
db.removeTagReplacing = function dbRemoveTagReplacing (profileName) {
    return this.removeBO(`tagReplacing:${profileName}`);
};

/**
 * Remove remove profile and tags for replacing from DB
 * @param {string} profileName - name of removing profile
 */
db.removeProfile = function dbRemoveProfile (profileName) {
    const promise = this.get("profileNames");
    promise.then((pns) => this.set("profileNames", pns.filter((pn) => pn !== profileName)));
    promise.catch(this.logError);
    return Promise.all([
        promise,
        this.remove(`profile:${profileName}`),
        this.removeTagReplacing(profileName),
    ]);
};

/**
 * Remove all record from DB
 */
db.clear = function dbClear () {
    return this.storage.clear();
};
