const fs = require('fs');
const {
    promisify
} = require('util');
const readDirAsync = promisify(fs.readdir);
const express = require('express');
const next = require('next')
const {
    join,
    basename,
    resolve
} = require('path');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser')
const http = require('http');

const ProgramDetails = require('./WebAssemblyAnalysis_Modules/ProgramDetails');
const Crawler = require('./WebAssemblyAnalysis_Modules/WebsiteCrawler');
const MySQLConnector = require('./WebAssemblyAnalysis_Modules/MySQLConnector');
const MQConnector = require('./WebAssemblyAnalysis_Modules/MQConnector');
const rabbitEmmiter = require('./WebAssemblyAnalysis_Modules/rabbit_emitter');
const CONFIG = require('./config.json');

const db = new MySQLConnector();
const mqConnector = new MQConnector();


let node_server_port = process.env.NODE_SERVER_PORT || CONFIG.node_server_port



if (typeof (node_server_port) == 'string') {
    node_server_port = parseInt(node_server_port);
}



const upload = multer({
    dest: join(__dirname, CONFIG.node_server_upload_folder)
});

const dev = process.env.NODE_ENV !== 'production'
const app = next({
    dev
})
const handle = app.getRequestHandler()

function randomid() {
    return new Date().getTime().toString() + Math.random().toString() + Math.random().toString();
}

app.prepare()
    .then(() => {
        const server = express();

        server.use(bodyParser.urlencoded({
            extended: false
        }))
        server.use(cors())
        server.use(bodyParser.json())
        server.use('/', express.static('public'))

        server.get('/results', (req, res) => {
            return res.redirect('/');
        })

        server.get('/statistic/:purpose/:stat/:metric', (req, res) => {
            app.render(req, res, '/statistic', req.params)
        })

        server.get('*', (req, res) => {
            return handle(req, res)
        })

        server.post('/uploadFile', upload.single('wasm-file'), async (req, res, next) => {
            const {
                file
            } = req;
            const {
                action,
                classifierType = 'neural'
            } = req.body;


            let features = [];

            if (action === 'upload') { //Wasm file upload request
                try {
                    const pd = new ProgramDetails(file.path, db, file.originalname);

                    features = [await pd.main()]; //Get features from WasmAnalyzer

                    let id = randomid(); //Get a unique ID for RabbitMQ task
                    const mqPayload = {classifierType, features};

                    mqConnector.sendTask(mqPayload, id); //Send the task to the queue
                    rabbitEmmiter.once(id, msg => {
                        //When this job is done...
                        const labels = JSON.parse(msg.toString());
                        const fileResults = features.map((feature, index) => {
                            const labelProbabilties = labels[index];
                            const sortedLabelsByProbability = [];
                            for (const purposeLabel in labelProbabilties) {
                                sortedLabelsByProbability.push([purposeLabel, labelProbabilties[purposeLabel]]);
                            }
                            sortedLabelsByProbability.sort(function (a, b) {
                                return b[1] - a[1];
                            });

                            return {
                                ...feature,
                                labels: sortedLabelsByProbability,
                                error: false
                            }
                        });
                        return res.json({
                            fileResults: fileResults,
                        });
                    });


                } catch (err) {
                    console.log(err);

                    return res.json({
                        fileResults: [{
                            error: true,
                            OriginalUploadFilename: file.originalname
                        }],
                    });
                }
            } else {
                return res.json({
                    fileResults: features,
                });

            }

        });

        server.post('/scan', async (req, res, next) => {
            const {
                action,
                urlToScan,
                classifierType = 'neural'
            } = req.body;
            let features = [];
            let crawlResults;
            let wasmFilePaths;

            try {
                const crawly = new Crawler(db);
                crawlResults = await crawly.main(urlToScan)
                if (crawlResults == null) {
                    return res.json({
                        fileResults: features,
                        error: 'crawlResults null'
                    });
                }

                wasmFilePaths = crawlResults.wasmFilePaths;
                for (const wasmFile of wasmFilePaths) {
                    const filename = basename(wasmFile);
                    try {
                        const pd = new ProgramDetails(wasmFile, db, filename, crawlResults);
                        const wasmFeatures = await pd.main();
                        features.push({
                            ...wasmFeatures,
                            error: false
                        })
                    } catch {
                        features.push({
                            error: true,
                            OriginalUploadFilename: filename,
                            CFGEdgeList: null
                        })
                    }
                }
            } catch (e) {
                console.error(e);

                return res.json({
                    fileResults: features,
                    errorText: 'Exception null',
                    error: e,
                    wasmFilePaths: wasmFilePaths

                });
            }

            let id = randomid(); //Get a unique ID for RabbitMQ task
            const mqPayload = {classifierType, features};
            mqConnector.sendTask(mqPayload, id); //Send the task to the queue
            rabbitEmmiter.once(id, msg => {
                //When this job is done...
                const labels = JSON.parse(msg.toString());
                const fileResults = features.map((feature, index) => {
                    if (feature.error === false) {

                        const labelProbabilties = labels[index];
                        const sortedLabelsByProbability = [];
                        for (const purposeLabel in labelProbabilties) {
                            sortedLabelsByProbability.push([purposeLabel, labelProbabilties[purposeLabel]]);
                        }
                        sortedLabelsByProbability.sort(function (a, b) {
                            return b[1] - a[1];
                        });

                        return {
                            ...feature,
                            labels: sortedLabelsByProbability,
                            error: false
                        }
                    } else {
                        return feature
                    }
                });
                return res.json({
                    fileResults: fileResults,
                    pageFound: crawlResults ? crawlResults.pageFound : null,
                    screenshots: crawlResults ? crawlResults.screenshots : [],
                    wasmFilePaths: wasmFilePaths

                });

            });

        });

        server.post('/getStatDetails', async (req, res) => {
            const {
                purpose,
                stat,
                metric
            } = req.body;
            const results = await ProgramDetails.getModuleByExtremeStatistic(purpose, stat, metric, db);
            if (results != null && results.features != null) {
                results.features.error = false;
            }
            return res.json(results);
        })




        const httpServer = http.createServer(server);

        httpServer.listen(node_server_port, function () {

            console.log(`HTTP Server running on port ${node_server_port}`);
        });

        let connectInterval = setInterval(() => {
            mqConnector.init()
                .then(() => {
                    clearInterval(connectInterval)
                })
                .catch(err => {
                    console.error(err)
                    console.log('Retrying in 5 seconds');
                })
        }, 6000);

    })
    .catch((ex) => {
        console.error(ex.stack)
        process.exit(1)
    })