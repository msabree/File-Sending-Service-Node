# File Sending Service

This app allows for a user to search for a title by name.

### Prerequisites

Ensure that you have node installed on your machine. The latest node can be download here:

https://nodejs.org/en/download/

### Installing

Clone or fork the repo and cd into the root directory of the project.

To setup the #relay module run the following commands from root dir:

cd relay

node app.js :<port>

The relay server is now ready to transfer files.


To setup the #send module run the following commands from root dir:

cd send

npm install

node app.js <host-and-port> <file-name>

This will output a secret code o be used by the reeive module program.


To setup the #receive module run the following commands from root dir:

cd receive

npm install

node app.js <host-and-port> <secret-code> <output-dir>

This will initiate the transaction.


## Authors

* **Makeen Sabree** - (https://github.com/msabree)