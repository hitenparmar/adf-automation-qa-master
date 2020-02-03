var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0063003c-0024-00c8-006b-002b00310092.png",
        "timestamp": 1580726604575,
        "duration": 7880
    },
    {
        "description": "select provider and apply |ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e100d3-0068-0067-0079-004600230054.png",
        "timestamp": 1580726613111,
        "duration": 736
    },
    {
        "description": "enter valid login details|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001400af-00e2-0037-000b-003500e9005d.png",
        "timestamp": 1580726614547,
        "duration": 1806
    },
    {
        "description": "should navigate to Files sections|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00eb005d-00e9-003b-00fc-0016009800d6.png",
        "timestamp": 1580726616906,
        "duration": 573
    },
    {
        "description": "should be able to select create new Folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005a0033-009f-009a-00fa-00fb005f0007.png",
        "timestamp": 1580726618416,
        "duration": 3781
    },
    {
        "description": "should not be able to create new folder with existing same name|ADF login and create file",
        "passed": false,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected '' to equal 'There's already a folder with this name. Try a different name.'."
        ],
        "trace": [
            "Error: Failed expectation\n    at filePage.verifyErrorMessageForDuplicateFolder (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:63:40)\n    at UserContext.<anonymous> (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/specs/testSpecs.js:42:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                "timestamp": 1580726625875,
                "type": ""
            }
        ],
        "screenShotFile": "00b500f1-0087-00e5-0039-00ad00f90013.png",
        "timestamp": 1580726622949,
        "duration": 3133
    },
    {
        "description": "should be able to select and delete the folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "387f2ae5717a2ed1b7ab318773ad9267",
        "instanceId": 47544,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001800fa-00a3-006a-008b-00f600c8000c.png",
        "timestamp": 1580726626790,
        "duration": 4836
    },
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "ab800ba2e3ceaeb8f6a31f5ded62f910",
        "instanceId": 50415,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00400093-0099-0053-00c5-00a900b600ce.png",
        "timestamp": 1580731383221,
        "duration": 6891
    },
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e20036-00c5-00c9-002d-00f800040054.png",
        "timestamp": 1580731462094,
        "duration": 7771
    },
    {
        "description": "select provider and apply |ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f0006a-0075-0076-00eb-00d2002f0007.png",
        "timestamp": 1580731470549,
        "duration": 726
    },
    {
        "description": "enter valid login details|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002200af-0025-00fa-0014-0002009600ca.png",
        "timestamp": 1580731471772,
        "duration": 1499
    },
    {
        "description": "should navigate to Files sections|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0022009a-00a6-00ef-0026-00650072002d.png",
        "timestamp": 1580731473724,
        "duration": 397
    },
    {
        "description": "should be able to select create new Folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000100bb-002e-0053-0087-002f00f100f1.png",
        "timestamp": 1580731475050,
        "duration": 2179
    },
    {
        "description": "should not be able to create new folder with existing same name|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                "timestamp": 1580731479450,
                "type": ""
            }
        ],
        "screenShotFile": "00a60088-0043-00f6-00b9-00c80047001c.png",
        "timestamp": 1580731477897,
        "duration": 1933
    },
    {
        "description": "should be able to select and delete the folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "7af288a5af38230657774debfdcb82ab",
        "instanceId": 50506,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e200af-0060-0056-00d5-004500cd0073.png",
        "timestamp": 1580731480439,
        "duration": 5165
    },
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f70082-0043-009a-00a5-006a005c0087.png",
        "timestamp": 1580731616413,
        "duration": 9161
    },
    {
        "description": "select provider and apply |ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00390055-005b-003d-0074-00440079002e.png",
        "timestamp": 1580731626212,
        "duration": 721
    },
    {
        "description": "enter valid login details|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00260066-00fe-00ec-003c-00ed00910005.png",
        "timestamp": 1580731627468,
        "duration": 1375
    },
    {
        "description": "should navigate to Files sections|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001900c1-0081-00c7-00d0-0042001700d1.png",
        "timestamp": 1580731629438,
        "duration": 913
    },
    {
        "description": "should be able to select create new Folder|ADF login and create file",
        "passed": false,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected 'f6d4ea90-839f-4fbf-9e08-c9e60d3ed2f3' to equal 'hhhh'.",
            "Expected 'guest guest' to equal 'hhhh'.",
            "Expected 'sdy' to equal 'hhhh'.",
            "Expected '8b649bc4-eb20-4d40-92a4-1e21d0353c7b' to equal 'hhhh'.",
            "Expected 'guest guest' to equal 'hhhh'.",
            "Expected 'test' to equal 'hhhh'.",
            "Expected '87eea6ee-30bc-4cd2-a406-b78accf7196a' to equal 'hhhh'.",
            "Expected 'guest guest' to equal 'hhhh'.",
            "Expected 'test444' to equal 'hhhh'.",
            "Expected 'c8a63b36-f988-469e-96d4-4e322a00ad31' to equal 'hhhh'.",
            "Expected 'guest guest' to equal 'hhhh'."
        ],
        "trace": [
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)",
            "Error: Failed expectation\n    at /Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:35:33\n    at /usr/local/lib/node_modules/protractor/built/element.js:804:32\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:94:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "005600d5-0024-00de-00e0-00f500930070.png",
        "timestamp": 1580731631228,
        "duration": 2181
    },
    {
        "description": "should not be able to create new folder with existing same name|ADF login and create file",
        "passed": false,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected '' to equal 'There's already a folder with this name. Try a different name.'."
        ],
        "trace": [
            "Error: Failed expectation\n    at filePage.verifyErrorMessageForDuplicateFolder (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:65:40)\n    at UserContext.<anonymous> (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/specs/testSpecs.js:42:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                "timestamp": 1580731635743,
                "type": ""
            }
        ],
        "screenShotFile": "00750036-00de-00cb-0081-00e8008c00f0.png",
        "timestamp": 1580731634161,
        "duration": 1789
    },
    {
        "description": "should be able to select and delete the folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "91aeb2f49fa730907aca962578dd5ed0",
        "instanceId": 50593,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b400aa-006d-009c-0008-00af003b005d.png",
        "timestamp": 1580731636717,
        "duration": 5174
    },
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ea00ee-00cd-0066-001c-00cc00f10062.png",
        "timestamp": 1580731693580,
        "duration": 10122
    },
    {
        "description": "select provider and apply |ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00700002-00d2-006b-0092-0018008d0044.png",
        "timestamp": 1580731704377,
        "duration": 701
    },
    {
        "description": "enter valid login details|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00160098-009c-00c0-001d-00ea00ec0040.png",
        "timestamp": 1580731705583,
        "duration": 1287
    },
    {
        "description": "should navigate to Files sections|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009400f8-0021-00be-0023-00ca00110059.png",
        "timestamp": 1580731707304,
        "duration": 338
    },
    {
        "description": "should be able to select create new Folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006f0085-0011-00ac-0002-004800cb0066.png",
        "timestamp": 1580731708778,
        "duration": 2143
    },
    {
        "description": "should not be able to create new folder with existing same name|ADF login and create file",
        "passed": false,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected '' to equal 'There's already a folder with this name. Try a different name.'."
        ],
        "trace": [
            "Error: Failed expectation\n    at filePage.verifyErrorMessageForDuplicateFolder (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:65:40)\n    at UserContext.<anonymous> (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/specs/testSpecs.js:42:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                "timestamp": 1580731712901,
                "type": ""
            }
        ],
        "screenShotFile": "008b0050-003a-0001-00be-003f00c1009a.png",
        "timestamp": 1580731711437,
        "duration": 1679
    },
    {
        "description": "should be able to select and delete the folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "136394150f7e193d6065d61fbd915419",
        "instanceId": 50657,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006700d6-0017-003f-001b-004c00ea0073.png",
        "timestamp": 1580731713830,
        "duration": 5080
    },
    {
        "description": "Navigate to Alfresco settings URL|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c900b2-00c1-0069-00ba-006c00520011.png",
        "timestamp": 1580731864351,
        "duration": 29374
    },
    {
        "description": "select provider and apply |ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0049008e-0015-000e-007d-0003009e00c2.png",
        "timestamp": 1580731894407,
        "duration": 863
    },
    {
        "description": "enter valid login details|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e50038-0096-00cc-0074-00d7002b0083.png",
        "timestamp": 1580731895836,
        "duration": 1461
    },
    {
        "description": "should navigate to Files sections|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006100fb-004b-0064-001f-006200fe0041.png",
        "timestamp": 1580731897796,
        "duration": 402
    },
    {
        "description": "should be able to select create new Folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00eb006f-00de-0012-0011-000200470027.png",
        "timestamp": 1580731898996,
        "duration": 2433
    },
    {
        "description": "should not be able to create new folder with existing same name|ADF login and create file",
        "passed": false,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected '' to equal 'There's already a folder with this name. Try a different name.'."
        ],
        "trace": [
            "Error: Failed expectation\n    at filePage.verifyErrorMessageForDuplicateFolder (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/Pages/filesPage.js:64:40)\n    at UserContext.<anonymous> (/Users/Hiten/Desktop/Protractor/adf-automation-qa-master/specs/testSpecs.js:42:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                "timestamp": 1580731903676,
                "type": ""
            }
        ],
        "screenShotFile": "00300088-00a9-0035-0020-00c400bb00e9.png",
        "timestamp": 1580731902116,
        "duration": 1810
    },
    {
        "description": "should be able to select and delete the folder|ADF login and create file",
        "passed": true,
        "pending": false,
        "os": "mac os x",
        "sessionId": "033bb104611de7ab17591572fb328779",
        "instanceId": 50791,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f90035-00cf-006d-0056-00800064008c.png",
        "timestamp": 1580731904949,
        "duration": 4776
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
