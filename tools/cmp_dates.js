const fs = require('fs');

const filename_left = process.argv[2];
const filename_right = process.argv[3];

const modified_left = fs.statSync(filename_left).mtimeMs;
const modified_right = fs.statSync(filename_right).mtimeMs;

process.exit(modified_left > modified_right ? 1 : 0);