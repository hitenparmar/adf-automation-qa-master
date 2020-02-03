let testData = require('../Data/TestData');

let loginPage = function () {

    let userName_Element = element(by.id('username'));
    let userPwd_Element = element(by.id('password'));
    let logInButton_Element = element(by.id('login-button'));
    let logInPageHeader_Element = element(by.xpath('//*[@class="adf-alfresco-logo"]/img'));

    this.enterUserName = function () {
        userName_Element.sendKeys(testData.getUserName());
    }

    this.enterUserPwd = function () {
        userPwd_Element.sendKeys(testData.getPwd());
    }

    this.selectSignIn = function () {
        logInButton_Element.click();
    }

    this.verifyLogInPage = function () {
        expect(logInPageHeader_Element.getAttribute('alt')).toEqual(testData.getLogInPageHeader());
    }
};

module.exports = new loginPage();