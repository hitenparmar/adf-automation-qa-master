let basePage = function () {
    this.openUrl = function (url) {
        browser.get(url);
    }
};

module.exports = new basePage();