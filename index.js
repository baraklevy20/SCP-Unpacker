/* eslint-disable no-nested-ternary */
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { unpack } = require('./src/scp');

const { argv } = yargs(hideBin(process.argv));

const main = async () => {
  const startTime = new Date().getTime();

  const promises = [];
  const filesToExtract = !argv.file ? [] : (Array.isArray(argv.file) ? argv.file : [argv.file]);
  const folders = !argv.folder ? [] : (Array.isArray(argv.folder) ? argv.folder : [argv.folder]);

  folders.forEach((folder) => {
    const scFiles = fs.readdirSync(folder);
    scFiles.forEach((scFile) => {
      filesToExtract.push(`${folder}/${scFile}`);
    });
  });

  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true });
  }

  filesToExtract.forEach((scFile) => {
    const lastSlash = scFile.lastIndexOf('/');
    fs.mkdirSync(`out/${scFile.substring(0, lastSlash)}/${scFile.substring(lastSlash + 1)}`, { recursive: true });
    promises.push(unpack(scFile));
  });

  const results = await Promise.allSettled(promises);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason);
    }
  });

  console.log(`Unpack time - ${new Date().getTime() - startTime}ms`);
};

main();
