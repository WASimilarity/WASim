const fs = require('fs');
const mv = require('mv');
const {
    promisify
} = require('util');
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const puppeteer = require('puppeteer-core');
const path = require('path');
const {
    makeFileHash,
    pr
} = require('./CommonUtilities');
const CONFIG = require('../config.json');
const dev = process.env.NODE_ENV !== 'production'
const crawler_module_dump = process.env.CRAWLER_MODULE_DUMP || CONFIG.crawler_module_dump;
const crawler_final_module_dump = process.env.CRAWLER_FINAL_MODULE_DUMP || CONFIG.crawler_final_module_dump;
const chromium_path = CONFIG.chromium_path;
const MODULE_DUMP_PATH = process.env.MODULE_DUMP_PATH || path.join(__dirname, crawler_module_dump);
const FINAL_MODULE_PATH = process.env.FINAL_MODULE_PATH || path.join(__dirname, crawler_final_module_dump);
const OUTPUT_DIRECTORY = FINAL_MODULE_PATH;
const TIME_TO_WAIT = CONFIG.time_to_wait || 30;
const NUM_SCREENSHOTS = CONFIG.number_of_screenshots || 5;

class Queue {
    // Retrieved from : https://www.geeksforgeeks.org/implementation-queue-javascript/
    // Array is used to implement a Queue
    constructor() {
        this.items = [];
    }

    enqueue(element) {
        // adding element to the queue
        this.items.push(element);
    }

    dequeue() {
        // removing element from the queue
        // returns underflow when called
        // on empty queue
        if (this.isEmpty()) return null;
        return this.items.shift();
    }

    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }

    numberOfItems() {
        return this.items.length;
    }
}

class Crawler {
    constructor(databaseConnector) {
        this.capturedRequests = {};
        this.browser = null;
        this.database = databaseConnector;
    }

    async cleanDir() {
        console.log('Cleaning Dir')
        try {
            let files = await readdir(MODULE_DUMP_PATH);
            for (let file of files) {
                await unlink(`${MODULE_DUMP_PATH}/${file}`)
            }
        } catch (e) {
            if (e.code == 'ENOENT') {
                await mkdir(MODULE_DUMP_PATH);
            }
        }
    }

    moveFile(currentPath, newPath) {
        return new Promise((resolve, reject) => {
            mv(currentPath, newPath, {
                clobber: true
            }, function (err) {
                if (err) {
                    console.error(err)
                    reject()
                    return;
                }
                resolve();
                return;
            })
        })
    }

    cleanDomain(domain){
        const returnString = domain.replace(/\//g, '__').replace(/:/g, '').replace(/\./g, '___').slice(0, 50)
        return returnString;
    }

    async moveWasmFilesOnPage(domain) {
        try {
            const dir = MODULE_DUMP_PATH;
            const domainName = this.cleanDomain(domain);
            const newFolderName = path.resolve(FINAL_MODULE_PATH, domainName);
            let files = await readdir(dir);
            if (files.length > 0) {
                //output to filestream:
                try {
                    await mkdir(newFolderName);
                } catch (mkdirErr) {
                    console.error(mkdirErr)
                }
                for (const file of files) {
                    let currentPath = path.resolve(dir, file)
                    let newPath = path.resolve(newFolderName, file)
                    await this.moveFile(currentPath, newPath)
                }
            }
        } catch (err) {
            // console.error(err)
            console.log('Error reading the Wasm dump directory')
            await this.cleanDir();
        }
    }

    async getMovedFilePaths(domain) {
        const domainName = this.cleanDomain(domain);
        const dir = path.resolve(FINAL_MODULE_PATH, domainName);
        let files = await readdir(dir);
        files = files.map(file => path.resolve(dir, file))
        return files;
    }

    async checkIfWasmDownloaded() {
        try {
            const dir = MODULE_DUMP_PATH;
            let files = await readdir(dir);
            console.log('Checking', files)

            if (files.length > 0) {
                return true;
            }
        } catch (err) {
            console.log('Can\'t read the Wasm dump directory')
        }

        return false;
    }

    async insertIntoDatabase(crawlResults) {
        if (crawlResults != null) {
            const {
                wasmFilePaths,
                pageFound,
                domain
            } = crawlResults;
            let sqlString = '';
            let sqlParams = [];
            const baseQuery = `INSERT INTO found_page(
                FileHash,
                PageFound
            ) VALUES(?,?);`
            for (const wasmFile of wasmFilePaths) {
                const filename = path.basename(wasmFile);
                const fileHash = await makeFileHash(wasmFile);
                sqlString += baseQuery;
                sqlParams.push(fileHash, pageFound);
            }
            if (sqlString != '') {
                await this.database.query(sqlString, sqlParams);
            }
        }
        return;
    }

    scanPage(domain) {
        this.capturedRequests = {};
        return new Promise(async (resolve, reject) => {
            let crawlResults = null;
            let stopCrawling = false;
            let page;
            let timeout;
            let currentURL;
            let webAssemblyWorkers = [];
            let allRecordedWorkers = [];
            const pageScreenshots = [];
            const cleanedURL = this.cleanDomain(domain);


            const finishCrawl = async () => {
                try {
                    await page.close()
                } finally {}
                const wasmFound = await this.checkIfWasmDownloaded();
                let targetFiles = [];
                if (wasmFound ) {
                    const graphDetails = {
                        window: null,
                        workers: null
                    }
                    let files;
                    if (wasmFound) {
                        await this.moveWasmFilesOnPage(domain)
                        files = await this.getMovedFilePaths(domain);
                    } else {
                        files = [];
                    }

                    // const requestsForPage = this.capturedRequests[currentURL];
                    targetFiles = files;
                    
                }

                crawlResults = {
                    wasmFilePaths: targetFiles,
                    pageFound: currentURL,
                    domain: domain,
                    // possibleWrapperFiles: requestsForPage,
                    // graphDetails: graphDetails,
                    screenshots: pageScreenshots
                }
            }

            const preloadFile = fs.readFileSync(path.join(__dirname, './instrumentationCode.js'), 'utf8');
            page = await this.browser.newPage();

            await page.evaluateOnNewDocument(preloadFile)
            // page.on('workercreated', async worker => {
            //     // console.log('Worker created: ' + worker.url())
            //     await worker.evaluate(preloadFile)
            //     try {
            //         await worker.evaluate(() => {
            //             setTimeout(() => {
            //                 console.log(self);
            //             }, 1000)
            //         })
            //         var currentWorkerWebAssembly = await worker.evaluateHandle(() => {
            //             return self.WebAssemblyCallLocations;
            //         })

            //         webAssemblyWorkers.push(currentWorkerWebAssembly);
            //     } catch (err) {
            //         console.error('Worker Eval', err)
            //     }
            // });

            page.on('error', async (error) => {
                console.error('Page crash', error);
                try {
                    await page.close()
                    page = await this.browser.newPage();
                } finally {
                    reject()
                }
            });

            page.setDefaultNavigationTimeout(15000)

            try {
                const currentURL = domain;
                this.capturedRequests[currentURL] = [];
                console.log(currentURL)
                timeout = setTimeout(() => {
                    finishCrawl()
                        .then(() => {
                            resolve(crawlResults)
                            this.closeBrowser()
                            .then(() => {
                            })
                            .catch(err => {
                                console.error(err)
                            });
                        })
                        .catch((err) => {
                            console.error('Timeout error:', err)
                        });
                }, (TIME_TO_WAIT + 10) * 1000)
                await page.goto(currentURL, {
                    waitUntil: 'domcontentloaded'
                });
                const cleanedDomainName = this.cleanDomain(domain)
                const timeIntervalToWaitBetweenShots = Math.floor((TIME_TO_WAIT - 1) / NUM_SCREENSHOTS);
                for(let i = 1; i <= NUM_SCREENSHOTS; i++ ){
                    try{
                        // const screenshotOutputPath = path.resolve(resolvedOutputPath,`screenshot_${cleanedDomainName}_${i}.png`);
                        const screenshotBase64 = await page.screenshot({
                            // path: screenshotOutputPath,
                            encoding: 'base64',
                            fullPage: false
                        });
                        pageScreenshots.push(screenshotBase64)
                    } catch(screenshotErr){
                        console.error(screenshotErr)
                    }
                    await page.waitFor(timeIntervalToWaitBetweenShots * 1000);
                }

                try {
                    await finishCrawl();
                } catch (crawlErr) {
                    console.error('Crawl process error', crawlErr);
                }


            } catch (err) {
                // console.error('Navigation error', err);
                    await page.close();
                    page = await this.browser.newPage();
                    await finishCrawl();
            }
            clearTimeout(timeout);
            resolve(crawlResults);
        })
    }

    async startBrowser() {
        if (this.browser != null) {
            return;
        }
        console.log(MODULE_DUMP_PATH);
        this.browser = await puppeteer.launch({
            executablePath: path.join(__dirname, chromium_path),
            args: [
                `--js-flags=--dump-wasm-module-path=${MODULE_DUMP_PATH}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
                /*,  '--auto-open-devtools-for-tabs'*/
            ],
            // devtools: true,
            dumpio: dev,
            headless: false
        });
    }

    async closeBrowser() {
        await this.browser.close();
    }

    async main(urlToCrawl) {

        if (!urlToCrawl.match(/http(s)?\:\/\//)) {
            urlToCrawl = 'https://' + urlToCrawl
        }
        let crawlResults = null;
        await this.cleanDir();
        await this.startBrowser();
        try {
            console.log('Crawling ', urlToCrawl)
            crawlResults = await (await this.scanPage(urlToCrawl));
            await this.insertIntoDatabase(crawlResults);
        } catch (e) {
            console.error(e)
        } finally {
            try {
                await this.closeBrowser();
            } finally {

            }
        }
        return crawlResults
    }
}

module.exports = Crawler;