const request = require('request');
const fs = require('fs');

const READ_INTERVAL_MS = 2500; // Read a chunk every 2 and half seconds

const commandLineArgs = process.argv.slice(2);
const hostAndPort = commandLineArgs[0];
const secretCode = commandLineArgs[1];
const outputPath = commandLineArgs[2];

const writeStack = [];

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

const addToStack = function(bytes) {
    writeStack.push(bytes);
}

const exhaustStack = function(path, fileName) {
    while(writeStack.length > 0){
        let bytes = writeStack.shift();
        fs.appendFileSync(`${path}/${fileName}`, Buffer.from(bytes, 'binary'));
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
                addToStack(res.bytes);
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