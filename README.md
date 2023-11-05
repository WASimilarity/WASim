# WASim
This repo hosts the code for the WASim submission to the ASE 2020 Demonstrations Track entitled, "[WasmView: Visual Testing for WebAssembly Applications](https://alan-romano.github.io/WasmView_Visual_Testing_for_WebAssembly_Applications.pdf)." The video demo below shows how the tool is used and how the output is presented.
### [Video Demo](https://youtu.be/usfYFIeTy0U)

## Docker Setup (Easiest)
#### Prequisites
- Docker
- Docker Compose
#### Setup
1. Download `database` folder and `docker-compose.yml` file to a local directory.
2. Open Terminal/Powershell/etc.. and navigate to directory with downloaded folder and file.
2a. Default port (4000) and other options can be modified in the docker-compose.yml file.
3. Run command `docker-compose up`.
4. Open a browser and navigate to the url http://localhost:4000.

## Local Setup
####Note: Chromium browser is compiled for Ubuntu 19.10, so tool will only run for this platform.
#### Prequisites
- Node.js
- Python
- MySQL
- RabbitMQ
- Git

1. Clone project to a local directory.
2. Download modified Chrome browser zip available [here](https://github.com/WASimilarity/WASim/raw/master/chromium.zip).
3. Run `database/schema.sql` in MySQL instance to create necessary database and tables.
4. Start up RabbitMQ.
5. Navigate to `Classifier Modules` directory.
6. Run `python Main.py` to start the Python listener to wait for tasks for the classifier.
7. Navigate to `Web_Server` directory.
8. Extract Chrome browser zip to this directory.
9. In `config.json`, change `chromium_path` field to point to downloaded path. (If following Step 8., field should be './chromium/chrome'.)
10. Run `npm run dev` to start the web server.
11. Open a browser and navigate to the url http://localhost:4000.
