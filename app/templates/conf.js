var os = require('os');
var path = require('path');
var mkdirp = require('mkdirp');
var SpecReporter = require('jasmine-spec-reporter');
var jSonXMLReporter = require('ruru-protractor-junit-reporter');
var HTMLScreenshotReporter = require('ruru-protractor-html-screenshot-reporter');
var waitPlugin = require('../src/js/wait-plugin.js');

const targetDir = 'target';

var xmlReporter = new jSonXMLReporter({
	title : 'Protractor End to End Test Results: <%=appName%>',
	xmlReportDestPath : './' + targetDir + '/protractor-e2e-report.xml'
});

var htmlReporter = new HTMLScreenshotReporter({
	savePath : 'screenshots/',
	title : 'Protractor End to End Test Results: <%=appName%>',
	htmlReportDestPath : './' + targetDir + '/protractor-e2e-report.html'
});

//Returns the IP of the machine running Protractor, or else, localhost, useful for development testing
function getIpAddress() {
	var ipAddress = null;
	var ifaces = os.networkInterfaces();
	function processDetails(details) {
		if (details.family === 'IPv4' && details.address !== '127.0.0.1' && !ipAddress) {
			ipAddress = details.address;
		}
	}
	for (var dev in ifaces) {
		ifaces[dev].forEach(processDetails);
	}
	return ipAddress;
}

exports.config = {

	framework : 'jasmine2',

	//Wait plugin makes sure Jasmine processes don't exit before all screen captures are taken
	plugins : [{
			path : '../src/js/wait-plugin.js'
		}
	],

	/*
	* If seleniumAddress is set, seleniumServerJar, seleniumPort and chromeDriver settings will be ignored
	* and tests will be ran in an already running instance of Selenium server, such as our internal Grid.
	* This is usually what you would use in CI.
	* Alternatively, this can be set by command line using $ grunt --seleniumAddress http://192.99.99.100:4444/wd/hub
	* If passed by command line it will override the setting in this file
	*/
	//seleniumAddress : 'http://127.0.0.1:4444/wd/hub',
	
	/*
	* Application under test base URL. 
	* Can be passed by command line using $ grunt --baseURL http://oamaru.internal.bis2.net:8080/
	* If passed by command line it will override the setting in this file.
	* Otherwise defaults to the IP of the machine that is running Protractor.
	*/
	baseUrl : '<%=baseUrl%>',

	/*
	* For multiCapabilities (testing in parallel with multiple browsers, use this
	* NOTE: PhantomJS works but is not recommended by Protractor
	* also, why a fake browser when you can test on the real browser?	
	* This is usually what you would use in CI.
	*/

	/*
	multiCapabilities : [
	{
		'browserName' : 'chrome',
		maxInstances : 2,
		shardTestFiles : true,
		chromeOptions: {
			args: ['--no-sandbox', '--disable-extensions']
		}
	}
	,
	{
		'browserName' : 'firefox',
		maxInstances : 2,
		shardTestFiles : true
	}
	],

	maxSessions : 20,
	*/

	/*
	* If multiCapabilities is not desired, use this instead
	*/
	capabilities : {
		'browserName' : 'chrome',
		maxInstances : 20,
		shardTestFiles : true,
		chromeOptions: {
			args: ['--no-sandbox', '--disable-extensions']
		}
	},
	
	/*
	* Restarting your browser between every test ensures independency at the cost of total execution time
	*/
	//restartBrowserBetweenTests:true,

	// Setup before any tests start
	beforeLaunch : function () {
		var newFolder = "";
		mkdirp('./' + targetDir + '/screenshots', function (err) {
			if (err) {
				console.error(err);
			}
		});
	},

	onPrepare : function () {

		//Add custom identifier
		require('protractor-linkuisref-locator')(protractor);

		// Assign the test reporters to each running instance
		jasmine.getEnv().addReporter(htmlReporter);
		jasmine.getEnv().addReporter(new SpecReporter({displayStacktrace : 'all'}));
		
		//Provide browser with capability information so that all specs can access it
		return browser.getProcessedConfig().then(function (config) {
			return browser.getCapabilities().then(function (cap) {
				browser.version = cap.get('version');
				browser.browserName = cap.get('browserName');
				browser.baseUrl  = config.baseUrl;
			});
		});
	},

	//Ensure Protractor does not closes browser until all reporting is done (including taking screenshots)
	onComplete : function () {
		return waitPlugin.resolve();
	},

	jasmineNodeOpts : {
		isVerbose : true,
		showColors : true,
		includeStackTrace : true,
		defaultTimeoutInterval : 90000,
		print : function () {}
	},

	specs : [
		'./example/specs/*spec.js'
	],

	//You must define a json output file so it can be post processed by the reporters
	resultJsonOutputFile : './target/protractor-e2e-results.json',

	//Post process
	afterLaunch : function (exitCode) {
		return new Promise(function (resolve) {
			console.log('jasmine afterLaunch - check your reports at ./' + targetDir);
			htmlReporter.generateHtmlReport(exports.config.resultJsonOutputFile);
			xmlReporter.generateXMLReport(exports.config.resultJsonOutputFile);
		});
	}

};
