let browserAction = function () {
    this.clickOnElement = function (element) {
        browser.click(element);
    }
};

module.exports = new browserAction();