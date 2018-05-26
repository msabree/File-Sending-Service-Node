const http = require('http');

const commandLineArgs = process.argv.slice(2);
let tcpPort = commandLineArgs[0];
if(tcpPort === undefined){
    tcpPort = 9021;
}
tcpPort = tcpPort.replace(':', '');

const hostname = '127.0.0.1';
const port = parseInt(tcpPort);
const fileStackMap = {};
let startStack = [];
let maxMemory = 40000000; // File transfer limit is 40MB
const chunkSize = 20000; // 20 KB per request transfer limit

const allocateBytes = function() {
    if(maxMemory < chunkSize){
        return 0;
    }
    maxMemory = maxMemory - chunkSize;
    return chunkSize;
}

const server = http.createServer((req, res) => {
    if(req.url.startsWith('/bytes')){
        const code = req.url.split('code=')[1];
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({bytes: allocateBytes()}));
        res.end();
    }
    else if(req.url.startsWith('/start')){
        const code = req.url.split('code=')[1];
        const origLen = JSON.parse(JSON.stringify(startStack)).length;
        startStack = startStack.filter((item) => item !== code.trim().toLowerCase());

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({start: startStack.length !== origLen}));
        res.end();
    }
    else if(req.url.startsWith('/initiate')){
        const code = req.url.split('code=')[1];
        startStack.push(code.trim().toLowerCase());
        fileStackMap[code.trim().toLowerCase()] = {
            metadata: {},
            bytes: [],
        };
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({}));
        res.end();
    }
    else if(req.url.startsWith('/read')){
        const code = req.url.split('code=')[1];
        const bytes = fileStackMap[code].bytes.shift();
        const fileName = fileStackMap[code].metadata.fileName;
        const fileSize = fileStackMap[code].metadata.fileSize;
        maxMemory += chunkSize;

        if(bytes === ''){
            delete fileStackMap[code.trim().toLowerCase()];
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({
            bytes,
            done: bytes === '',
            fileName,
            fileSize,
        }));
        res.end();
    }
    else if(req.url.startsWith('/send')){
        var body = '';
        req.on('data', function (data) {
            body += data;
        });
        req.on('end', function () {
            let reqJson = JSON.parse(body);
            if(typeof reqJson === 'string'){
                reqJson = JSON.parse(reqJson);
            }
            // store bytes in stack map
            fileStackMap[reqJson.code.trim().toLowerCase()].bytes.push(reqJson.bytes);
            fileStackMap[reqJson.code.trim().toLowerCase()].metadata['fileName'] = reqJson.fileName;
            fileStackMap[reqJson.code.trim().toLowerCase()].metadata['fileSize'] = reqJson.fileSize;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({}));
        res.end();
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
