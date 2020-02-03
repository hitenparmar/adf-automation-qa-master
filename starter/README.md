## Prerequisites
- install Node 
- `npm install -g protractor` to install protractor
- `npm install` to install the project dependencies
- install jasmine-spec-reporter
- `npm install jasmine-spec-reporter --save-dev` to install jasmine spec report
- install protractor-beautiful-reporter
-`npm install protractor-beautiful-reporter --save-dev` to install Protractor beautiful Report with Screenshots

## Run Tests
- run tests on Terminal: `protractor ./starter/conf.js`
- run tests on WebStorm 
    Edit Run Configuration : 
    - select Protractor from Add new configuration
    - give `conf.js` file path in Configuration File
    - give installed `node` path to Node Interpreter
    - give installed `protractor` path to Protractor Package

## Description
- Project setup with Protractor Version 5.4.3
- Makes use of Page Objects 
- Written in JavaScript
- Page Objects are in `./Pages` directory
- Test data are in `./Data/TestData.js` directory
- Specs are in `./specs` directory
- Utility function are in `./util` directory
- HTML Test Reports with Screenshots are in `./TestReport/screenshots` directory
- Running the tests on default browser `chrome`