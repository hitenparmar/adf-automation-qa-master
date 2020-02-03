let testData = require('../Data/TestData')

let homepage = function () {
    let contentService_Element = element(by.css('[data-automation-id="Content Services"]'));
    let homePageHeader_Element = element(by.xpath('//*[@class="adf-app-title"]'))

    this.filesSection = function () {
        contentService_Element.click();
    }

    this.verifyHomePage = function () {
        expect(homePageHeader_Element.getAttribute('aria-label')).toEqual(testData.getHomePageHeader());
    }
};

module.exports = new homepage();