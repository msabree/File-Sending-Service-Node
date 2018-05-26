const request = require('request');
const fs = require('fs');

const commandLineArgs = process.argv.slice(2);
const hostAndPort = commandLineArgs[0];
const filePath = commandLineArgs[1];

const SEND_INTERVAL_MS = 2500; // Send a chunk every 2 and half seconds

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

const sendBytes = function(bytes) {  
    const filePathArray = filePath.split('/'); 
    return new Promise((resolve, reject) => {
        const options = {
            uri: `${hostAndPort}/send`,
            method: 'POST',
            json: true,
            body: JSON.stringify({
                bytes: Buffer.from(bytes).toString('binary'),
                code,
                fileName: filePathArray[filePathArray.length - 1]
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

const startSending = function(fileBuff) {

    let done = false;

    const intervalId = setInterval(function(){
        getAvailableBytes()
        .then((res) => {
            let bytesToSend = 0;
            if(res.bytes > fileBuff.length){
                bytesToSend = fileBuff;
                done = true;
            }
            else{
                bytesToSend = fileBuff.slice(0, res.bytes);
            }
    
            return sendBytes(bytesToSend);
        })
        .then(() => {
            if(done === true){
                sendBytes('')
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

if(filePath === undefined){
    console.log('A file path is required. Ex -> ./sample.txt');
    process.exit();
}

// Read the file into memory
const fileBuffer = fs.readFileSync(filePath);

// Log the code to the sender to share
console.log(code);

const intervalId = setInterval(function(){
    confirmStartSend()
    .then((res) => {
        if(res.start === true){
            startSending(fileBuffer)
            clearInterval(intervalId);
        }
    })
    .catch((err) => {
        console.log(err);
        process.exit();
    })
}, 1000);