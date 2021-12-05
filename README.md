# SCP-Unpacker
An unpacker for Supercell's new packer - SCP.

## Installation
* Install NPM - https://www.npmjs.com/get-npm
* Install Node - https://nodejs.org/en/download/
* Clone the project - `git clone https://github.com/baraklevy20/SCP-Unpacker.git`
* Run `cd SCP-Unpacker`
* Run `npm i`
* Done, now you can use the unpacker.

## Usage
Extract a list of files - `node index.js --file assets/font.osm --file assets/ui.osm`

Extract a directory - `node index.js --folder assets`

You can also combine them - `node index.js --folder assets --file assets2/font.osm`
