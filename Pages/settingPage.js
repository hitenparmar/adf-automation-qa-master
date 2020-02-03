let basePage = require('../Pages/basePage');
let testData = require('../Data/TestData');


let settingPage = function () {
    let providerDropDown = element(by.id('adf-provider-selector'));
    let applyButton = element(by.id('host-button'));
    let optionSelect = element(by.id('mat-option-1'));
    let pageHeader = element(by.xpath('//*[@class="adf-setting-toolbar mat-toolbar mat-primary mat-toolbar-single-row"]/h3'));

    this.selectValueFromProviderDropdown = function (dropDownValue) {
        providerDropDown.click();
        optionSelect.click();
    }

    this.selectApplyButton = function() {
        applyButton.click();
    }

    this.verifyPageLoaded = function () {
        browser.waitForAngular();
        expect(pageHeader.getText()).toEqual(testData.getSettingPageHeader());
    }

};

module.exports = new settingPage();