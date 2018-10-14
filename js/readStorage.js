/*jshint esversion: 6 */

// const storage = chrome.storage.sync;
const db = {

    storage: chrome.storage.sync,

    get error() { return chrome.runtime.lastError; },

    // default stub for errors
    logError: function (error) {
        console.error(error);
        console.trace();
        throw error;
    },

    /**
     * Get one or more records from DB
     * @param {string, object} fields - name of single reading record or object with keys=record names and values=default values
     * @param {*} [defVal] - default value of the single reading record
     */
    get: function (fields, defVal) {
        let key = null;
        if (typeof(fields) !== "object") {
            key = fields.toString();
            fields = {};
            fields[key] = (arguments.length === 1) ? null : defVal;
        }
        let p = new Promise((resolve, reject) =>
            this.storage.get(fields, (items) =>
                this.error ? reject(this.error) : resolve(key ? items[key] : items)));
        p.catch(this.logError);
        return p;
    },

    /**
     * Get big record
     * @param {string} key - name of the record
     */
    getBO: function (key) {
        let p = new Promise((resolve, reject) =>
            this.get(key + "_length", 1)
                .then((len) => {
                    let fields = {};
                    for (let i = 0; i < len; i++) {
                        fields[key + (i ? "_"+i : "")] = "";
                    }
                    return this.get(fields);
                })
                .then((parts) => {
                    let json = "";
                    for (let i = 0; parts[key + (i ? "_"+i : "")]; i++) {
                        json += parts[key + (i ? "_"+i : "")];
                    }
                    resolve(JSON.parse(json || "{}"));
                })
                .catch(error => reject(error))
        );
        p.catch(this.logError);
        return p;
    },


    /**
     * Get profile
     * @param {string} profileName - name of the profile
     */
    getProfile: function (profileName) {
        const defProfile = {
            tagPrefix:      "#",
            tagDelimeter:   " ",
            wordDelimeter:  "",
            lowerCase:      false,
            copyrightsOnly: true,
            buttonName:     "#",
            contextMenu:    false,
            hotkey:         "",
            profileName:    profileName,
        };
        return this.get("profile:"+profileName, defProfile);
    },
    /**
     * Get tags for replacing
     * @param {string} profileName - name of the profile
     */
    getTagReplacing: function (profileName) {
        return this.getBO("tagReplacing:" + profileName);
    },
};