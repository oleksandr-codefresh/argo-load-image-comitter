const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const yamlUtils = require('js-yaml');

async function main() {
    console.log('Props')
    console.log(JSON.stringify(process.env, null, 2))
}

main()
