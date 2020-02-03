let testData = function () {
    let userName = "guest@example.com";
    let userPwd = "Password";
    let settingsUrl = "http://qaexercise.envalfresco.com/settings";
    let providerName = "ECM";
    let settingPageHeanderName = "Settings";
    let logInPageHeaderName = "Alfresco, make business flow";
    let homePageHeaderName = "ADF Demo Application";
    let duplicateFolderErrMsg = "There's already a folder with this name. Try a different name.";
    let folderName = "hhhh";
    let folderDescription = "rrrr";

    this.getUserName = function () {
        return userName;
    }

    this.getPwd = function () {
        return userPwd;
    }

    this.getSettingPageUrl = function () {
        return settingsUrl;
    }

    this.getProviderName = function () {
        return providerName;
    }

    this.getSettingPageHeader = function () {
        return settingPageHeanderName;
    }

    this.getLogInPageHeader = function () {
        return logInPageHeaderName;
    }

    this.getHomePageHeader = function () {
        return homePageHeaderName;
    }

    this.getDuplicateFolderErrMsg = function () {
        return duplicateFolderErrMsg;
    }

    this.getFolderName = function () {
        return folderName;
    }

    this.getFolderDesc = function () {
        return folderDescription;
    }
};

module.exports = new testData();

