// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = require('fs');
const path = require('path');

for (let inputPath of process.argv.slice(2)) {
  if (!inputPath.includes('/node_modules/' || !inputPath.endsWith('.css'))) {
    console.warn('Input path for css-module-wrap should be a css file in node_modules');
    process.exit(1);
  }

  const fileName = inputPath.substring(inputPath.lastIndexOf('/') + 1);
  const outputPath = inputPath.replace('/node_modules/', '/deps/').slice(0, -4) + '.js';
  ensureDirectoryExists(outputPath);
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outputPath);

  writeStream.write(
`const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = \`<dom-module id="${fileName}">
  <template>
    <style>
`);
  readStream.on('data', chunk => {
    writeStream.write(chunk.toString('utf8').replace(/\\/g, '\\\\'));
  }).on('end', () => {
    writeStream.write(`
    </style>
  </template>
</dom-module>\`;
document.head.appendChild($_documentContainer.content);`);
  });
}

function ensureDirectoryExists(filePath) {
  let dirName = path.dirname(filePath);
  if (!fs.existsSync(dirName)) {
    ensureDirectoryExists(dirName);
    fs.mkdirSync(dirName);
  }
}
