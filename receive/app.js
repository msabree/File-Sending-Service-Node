const request = require('request');
const fs = require('fs');
const shell = require('shelljs');

const READ_INTERVAL_MS = 1000; // Read a chunk every second

const commandLineArgs = process.argv.slice(2);
const hostAndPort = commandLineArgs[0];
const secretCode = commandLineArgs[1];
const outputPath = commandLineArgs[2];

const writeStack = [];
const fileSuffix = new Date().getTime(); // ensure filename uniqueness
let bytesRead = 0;
let lastPercent = 0;

// Send the code to initiate the file transfer
const initiateTransfer = function(code) {
    return new Promise((resolve, reject) => {
        request(`${hostAndPort}/initiate?code=${code}`, {json: true}, (err, res, body) => {
            if (err) { 
                reject(err);
            }

            resolve(body);
        })
    })
}

const getNextChunk = function(code) {
    return new Promise((resolve, reject) => {
        request(`${hostAndPort}/read?code=${code}`, {json: true}, (err, res, body) => {
            if (err) { 
                reject(err);
            }

            resolve(body);
        })
    })
}

const addToStack = function(bytes, fileSize) {
    bytesRead += bytes.length;
    writeStack.push(bytes);

    let percent = Math.round((bytesRead/fileSize) * 100);
    if(percent > 100){
        percent = 100;
    }

    if(percent !== lastPercent){
        // calculate percent downloaded
        lastPercent = percent;
        process.stdout.write(`Percent downloaded: ${percent}% \r`)
    }
}

const exhaustStack = function(path, fileName) {
    shell.mkdir('-p', path);
    while(writeStack.length > 0){
        let bytes = writeStack.shift();
        fs.appendFileSync(`${path}/${fileSuffix}_${fileName}`, Buffer.from(bytes, 'binary'));
    }
}

if(hostAndPort === undefined){
    console.log('Host and port are required. Ex -> http://localhost:9021');
    process.exit();
}

if(secretCode === undefined){
    console.log('A secret code is required. Supplied by the sender');
    process.exit();
}

if(outputPath === undefined){
    console.log('A file output path is required. Ex -> ./');
    process.exit();
}

initiateTransfer(secretCode)
.then((res) => {
    const intervalId = setInterval(function(){
        getNextChunk(secretCode)
        .then((res) => {
            if(res.done === true){
                clearInterval(intervalId);
                process.exit();
            }
            else if(res.bytes !== undefined){
                addToStack(res.bytes, res.fileSize);
                exhaustStack(outputPath, res.fileName)
            }
        })
        .catch((err) => {
            console.log(err);
            process.exit();
        })
    }, READ_INTERVAL_MS);
})
.catch((err) => {
    console.log(err);
    process.exit();
})