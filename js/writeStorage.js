/*jshint esversion: 6 */

if (!db) console.error("No db");

/**
 * Save one or more records to DB
 * @param {string, object} fields - name of single saving record or object with keys=record names and values=saving values
 * @param {*} [value] - value of the single saving record
 */
db.set = function (fields, value) {
    if (typeof(fields) !== "object") {
        let o = {};
        o[fields.toString()] = value;
        fields = o;
    }
    let p = new Promise((resolve, reject) =>
        this.storage.set(fields, () => this.error ? reject(this.error) : resolve()));
    p.catch(this.logError);
    return p;
}.bind(db);

/**
 * Save big object that can cause error "QUOTA_BYTES_PER_ITEM quota exceeded"
 * @param {string} key - name of the object
 * @param {*} value - saving object
 */
db.setBO = function (key, value) {
    let fields = {};
    let json = JSON.stringify(value);
    let i = 0, len = limit = this.storage.QUOTA_BYTES_PER_ITEM - (key.length+3) - 2;
    while (json.length > 0) {
        let part = json.substr(0, len);
        while (JSON.stringify(part).length > limit) {
            len -= 100;
            part = json.substr(0, len);
        }
        fields[key + (i ? "_"+i : "")] = part;
        json = json.substr(len);
        i++;
    }
    fields[key + "_length"] = i;
    return this.set(fields);
}.bind(db);

/**
 * Safe save profile
 * @param {string} profileName - name of the profile
 * @param {object} profile - profile
 */
db.setProfile = function (profileName, profile) {
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
    Object
        .keys(defProfile)
        .forEach(key => { if (!profile.hasOwnProperty(key)) profile[key] = defProfile[key]; });
    return this.set("profile:" + profileName, profile);
}.bind(db);

/**
 * Save tags for ragplacing
 * @param {string} profileName - name of the profile
 * @param {object} tagReplacing - the tags
 */
db.setTagReplacing = function (profileName, tagReplacing) {
    return this.setBO("tagReplacing:" + profileName, tagReplacing);
}.bind(db);

/**
 * Remove record(s) from DB
 * @param {string,arrays} fields - name(s) of removing record(s)
 */
db.remove = function (fields) {
    if (!Array.isArray(fields)) {
        fields = [fields.toString()];
    }
    let p = new Promise((resolve, reject) =>
        this.storage.remove(fields, () =>
            this.error ? reject(this.error) : resolve()));
    p.catch(this.logError);
    return p;
}.bind(db);

/**
 * Remove big record from DB
 * @param {string} key - name of removing record
 */
db.removeBO = function (key) {
    let p = new Promise((resolve, reject) => db.get(key + "_length")
        .then(length => {
            let list = [key + "_length"];
            for (let i = 0; i < length; i++) list.push(key + (i ? "_"+i : ""));
            return db.remove(list);
        })
        .then(() => resolve())
    );
    p.catch(this.logError);
    return p;
}.bind(db);

/**
 * Remove tags for replacing from DB
 * @param {string} profileNames - name of profile using these tags
 */
db.removeTagReplacing = function (profileName) {
    return this.removeBO("tagReplacing:" + profileName);
}.bind(db);

/**
 * Remove remove profile and tags for replacing from DB
 * @param {string} profileName - name of removing profile
 */
db.removeProfile = function (profileName) {
    let p = db.get("profileNames");
    p.then(pns => db.set("profileNames", pns.filter((pn) => pn !== profileName)));
    p.catch(this.logError);
    return Promise.all([
       p,
       this.remove("profile:" + profileName),
       this.removeTagReplacing(profileName),
    ]);
}.bind(db);

/**
 * Remove all record from DB
 */
db.clear = function () {
    let p = new Promise((resolve, reject) =>
        this.storage.clear(() => this.error ? reject(this.error) : resolve()));
    p.catch(this.logError);
    return p;
}.bind(db);