const acorn = require('acorn');
const fs = require('fs');

const buffer = fs.readFileSync('./test/test.js').toString();

const docs = [];
const metadata = acorn.parse(buffer, {
    locations: true,
    // 注释
    onComment: docs,
});
// console.log(JSON.stringify(metadata.body));
// console.log('\n')
// console.log( JSON.stringify(docs));
const body = metadata.body;
// find rule
