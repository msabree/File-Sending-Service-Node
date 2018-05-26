const request = require('request');
const fs = require('fs');

const commandLineArgs = process.argv.slice(2);
let hostAndPort = commandLineArgs[0];
const filePath = commandLineArgs[1];

const SEND_INTERVAL_MS = 1000; // Send a chunk every second

let readStart = 0;

// alphanumeric 5 char string case insensitive
const generateSecretCode = function() {
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    let text = '';

    for (var i = 0; i < 10; i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

// Generate Secret Code
const code = generateSecretCode();

// Ask the server how many bytes are available to send
// There are server memory constraints so we must send chunks of file until entire file is sent.
const getAvailableBytes = function() {
    return new Promise((resolve, reject) => {
        request(`${hostAndPort}/bytes?code=${code}`, {json: true}, (err, res, body) => {
            if (err) { 
                reject(err);
            }

            resolve(body);
        })
    })
}

const confirmStartSend = function() {
    return new Promise((resolve, reject) => {
        request(`${hostAndPort}/start?code=${code}`, {json: true}, (err, res, body) => {
            if (err) { 
                reject(err);
            }

            resolve(body);
        })
    })
}

const sendBytes = function(bytes, fileSize) {  
    const filePathArray = filePath.split('/'); 
    return new Promise((resolve, reject) => {
        const options = {
            uri: `${hostAndPort}/send`,
            method: 'POST',
            json: true,
            body: JSON.stringify({
                bytes: Buffer.from(bytes).toString('binary'),
                code,
                fileName: filePathArray[filePathArray.length - 1],
                fileSize,
            })
        }
        request(options, (err, res, body) => {
            if (err) { 
                reject(err);
            }

            resolve(body);
        })
    })
}

const startSending = function(fileBuff, fileSize) {

    let done = false;
    let fileBufferToRead = fileBuff;

    const intervalId = setInterval(function(){
        getAvailableBytes()
        .then((res) => {
            if(res.bytes === 0){
                return Promise.resolve(); // wait for available memory on server
            }
            else{
                let bytesToSend = 0;
                if(res.bytes > fileBufferToRead.length){
                    bytesToSend = fileBufferToRead.slice(0, fileBufferToRead.length);
                    done = true;
                }
                else{
                    bytesToSend = fileBufferToRead.slice(0, res.bytes);
                    fileBufferToRead = fileBufferToRead.slice(res.bytes, fileBufferToRead.length);
                }
        
                return sendBytes(bytesToSend, fileSize);
            }
        })
        .then(() => {
            if(done === true){
                sendBytes('', fileSize)
                .then(() => {
                    clearInterval(intervalId);
                    process.exit();
                })
            }
        })
        .catch((err) => {
            console.log(err);
            process.exit();
        })
    }, SEND_INTERVAL_MS)
}

if(hostAndPort === undefined){
    console.log('Host and port are required. Ex -> http://localhost:9021');
    process.exit();
}

// trim trailing slash
hostAndPort = hostAndPort.replace(/\/$/, "");

if(filePath === undefined){
    console.log('A file path is required. Ex -> ./sample.txt');
    process.exit();
}

// Read the file into memory
const fileBuffer = fs.readFileSync(filePath);
const origLen = fileBuffer.length;

// Log the code to the sender to share
console.log(code);

const intervalId = setInterval(function(){
    confirmStartSend()
    .then((res) => {
        if(res.start === true){
            startSending(fileBuffer, origLen)
            clearInterval(intervalId);
        }
    })
    .catch((err) => {
        console.log(err);
        process.exit();
    })
}, 1000);