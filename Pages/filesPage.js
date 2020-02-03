let testData = require('../Data/TestData');

let filePage = function () {
    let createNewFolder = element(by.css('[data-automation-id="create-new-folder"]'));
    let folderName = element(by.id('adf-folder-name-input'));
    let description = element(by.id('adf-folder-description-input'));
    let create = element(by.id('adf-folder-create-button'));
    let cancel = element(by.id('adf-folder-cancel-button'));
    const folder_name = 'hhhh';
    const desc = 'rrrrr';

    this.selectCreateNewFolder = function () {
        createNewFolder.click();
        browser.waitForAngular();
    }

    this.createFolder = function () {
        folderName.sendKeys(testData.getFolderName());
        description.sendKeys(testData.getFolderDesc());
        create.click();
    }

    this.cancelCreateFolder = function () {
        cancel.click();
    }

    this.verifyFolderCreated = function () {
       let dataTable = element.all(by.xpath('//*[@class="adf-datatable-content-cell"]/span'));
           dataTable.each(function (row) {
               row.getText().then(function (text) {
                   if(text == folder_name){
                      // console.log('New Folder is Created : '+folder_name)
                       expect(text).toEqual(folder_name);
                   }
               });
           });
    }

    this.selectAndDeleteFolder = function () {
        let dataTable = element.all(by.xpath('//*[@class="adf-datatable-content-cell"]/span'));
        dataTable.each(function (row) {
            row.getText().then(function (text) {
                if (text == folder_name) {
                    let rowToSelect = element(by.xpath('//*[@class="adf-datatable-row ng-star-inserted"][@aria-label="'+text+'"]'));
                    rowToSelect.click();
                    // console.log('Selecting Folder : '+text);
                    browser.waitForAngular();
                    let actionOptions = element(by.xpath('//*[@class="adf-datatable-row ng-star-inserted adf-is-selected"]/div[8]'));
                    actionOptions.click();
                    browser.waitForAngular();
                    return;
                }
            })

        })
        let deleteOption = element(by.xpath('//*[@class="mat-menu-item ng-star-inserted"][@aria-label="Delete"]'));
        deleteOption.click();
        browser.waitForAngular();
    }

    this.verifyErrorMessageForDuplicateFolder = function () {
        let errorMessage = element(by.xpath('//div[@class="cdk-live-announcer-element cdk-visually-hidden"]'));

        expect(errorMessage.getText()).toEqual(testData.getDuplicateFolderErrMsg());
    }
};

module.exports = new filePage();