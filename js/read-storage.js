/* eslint-env webextensions */

"use strict";

// const storage = chrome.storage.sync;
const db = { // eslint-disable-line no-unused-vars

    storage: chrome.storage.sync,

    doStorage (method, data) {
        const promise = new Promise((resolve, reject) => this.storage[method](data, (result) => {
            if (this.hasError()) {
                reject(this.getError());
            } else {
                resolve(result);
            }
        }));
        promise.catch(this.logError);
        return promise;
    },

    hasError () { return !!chrome.runtime.lastError; },

    getError () { return chrome.runtime.lastError; },

    // default stub for errors
    logError (error) {
        console.error(error);
        console.trace();
        throw error;
    },

    /**
     * Get one or more records from DB
     * @param {string, object} fields - name of single reading record or
     * object with keys=record names and values=default values
     * @param {*} [defVal] - default value of the single reading record
     */
    get (fields, defVal) {
        let key = null;
        let data = fields;
        if (typeof fields !== "object") {
            key = fields.toString();
            data = {
                [key]: (defVal === undefined) ? null : defVal,
            };
        }
        return this.doStorage("get", data)
            .then((items) => (key ? items[key] : items));
    },

    /**
     * Get big record
     * @param {string} key - name of the record
     */
    async getBO (key) {
        const length = await this.get(`${key}_length`, 1);
        const fields = {};
        for (let i = 0; i < length; i++) {
            fields[`${key}_${i}`] = "";
        }
        const parts = await this.get(fields);
        let json = "";
        for (let i = 0; parts[`${key}_${i}`]; i++) {
            json += parts[`${key}_${i}`];
        }
        return JSON.parse(json || "{}");
    },


    /**
     * Get profile
     * @param {string} profileName - name of the profile
     */
    getProfile (profileName) {
        const defProfile = {
            tagPrefix:      "#",
            tagDelimeter:   " ",
            wordDelimeter:  "",
            lowerCase:      false,
            copyrightsOnly: true,
            buttonName:     "#",
            contextMenu:    false,
            hotkey:         "",
            profileName,
        };
        return this.get(`profile:${profileName}`, defProfile);
    },
    /**
     * Get tags for replacing
     * @param {string} profileName - name of the profile
     */
    getTagReplacing (profileName) {
        return this.getBO(`tagReplacing:${profileName}`);
    },
};
