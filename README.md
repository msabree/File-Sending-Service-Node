# File Sending Service

A file sending service written in NodeJS. 

NOTES:

Only one relay is necessary. You can open up as many sending and receiving sessions as desired. The relay can
handle multiple file transfer sessions and will transfer files in chunks to keep server memory under ~40MB.

### Prerequisites

Ensure that you have node installed on your machine. The latest node can be download here:

https://nodejs.org/en/download/

### Installing

Clone or fork the repo and open project to root dir in three separate terminals.


(Terminal 1) 
To setup the relay module run the following commands from root dir:

    cd relay

    node app.js :<port>

The relay server is now ready to transfer files.


(Terminal 2)
To setup the send module run the following commands from root dir:

    cd send

    npm install

    node app.js <host-and-port> <file-name>

This will output a secret code o be used by the reeive module program.


(Terminal 3)
To setup the receive module run the following commands from root dir:

    cd receive

    npm install

    node app.js <host-and-port> <secret-code> <output-dir>

This will initiate the transaction.


## Authors

* **Makeen Sabree** - (https://github.com/msabree)