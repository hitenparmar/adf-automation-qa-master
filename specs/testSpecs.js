let settingPage = require('../Pages/settingPage');
let basePage = require('../Pages/basePage');
let loginPage = require('../Pages/logInPage');
let homepage = require('../Pages/homePage');
let filesPage = require('../Pages/filesPage');
let testData = require('../Data/TestData');


describe('ADF login and create file', function () {

    it('Navigate to Alfresco settings URL', function () {
        basePage.openUrl(testData.getSettingPageUrl());
        settingPage.verifyPageLoaded();
    });

    it('select provider and apply ', function () {
        settingPage.selectValueFromProviderDropdown(testData.getProviderName());
        settingPage.selectApplyButton();
        loginPage.verifyLogInPage();
    });

    it('enter valid login details',function () {
        loginPage.enterUserName();
        loginPage.enterUserPwd();
        loginPage.selectSignIn();
        homepage.verifyHomePage();
    });

    it('should navigate to Files sections', function () {
        homepage.filesSection();
    });

    it('should be able to select create new Folder', function () {
        filesPage.selectCreateNewFolder();
        filesPage.createFolder();
        filesPage.verifyFolderCreated();
    });

    it('should not be able to create new folder with existing same name', function () {
        filesPage.selectCreateNewFolder();
        filesPage.createFolder();
        filesPage.verifyErrorMessageForDuplicateFolder();
        filesPage.cancelCreateFolder();
    });

    it('should be able to select and delete the folder', function () {
        filesPage.selectAndDeleteFolder();
    });
});