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
//
// 校验规则
// const loginRule = {
//     // 手机号
//     phone: { type: 'string', format: /^1[3-9]\d{9}$/ },
//     // 验证码, 1-6 位
//     code: { type: 'string', format: /^\d{1,6}$/ },
// }

// 查找 rule 函数, 获取接口说明, 响应等等
const findRuleActionResponseNode = parseBody => {
    let ruleNode = null;
    let actionNode = null;
    let responseNode = null;
    for (const node of parseBody) {
        if (!node.type) {
            continue;
        }
        if (node.type === 'VariableDeclaration') {
            if (node.declarations) {
                if (node.declarations[0].id.name.match(/^\w+Rule$/)) {
                    ruleNode = node;
                } else if (node.declarations[0].id.name.match(/^\w+Response$/)) {
                    responseNode = node;
                }

            }
        }
        // 只能有一个class
        if (node.type === 'ClassDeclaration') {
            actionNode = node;
        }

    }
    return {ruleNode, actionNode, responseNode};
}

// 获取 rule 字段注释中的说明文档, action 函数的说明文档
const getLineComment = (allDoc, allLine) => {
    const allComment = {};
    for (const d of allDoc) {
        if (d.type === 'Line') {
            for (const line of allLine.values()) {
                if (d.loc.start.line === line - 1) {
                    allComment[line] = d.value.trim();
                    allLine.delete(line);
                    break;
                }
            }
        }
    }
    return allComment;
}


const {ruleNode, actionNode, responseNode} = findRuleActionResponseNode(body);

// api 接口文档
const apiDoc = {};
const commentLines = new Set();

// 查找 key-value 结构
const getProperty = properties => {
    const result = [];
    for (const property of properties) {
        const name = property.key.name;
        const commentLine = property.key.loc.start.line;
        commentLines.add(commentLine);
        // 值
        let value = null;
        if (!property.value.hasOwnProperty('properties')) {
            // 单个属性
            value = property.value.value;
            const valueType = typeof value;
            result.push({name, commentLine, value, valueType});
        } else {
            // 需要循环查找
            value = getProperty(property.value.properties);
            result.push({name, commentLine, value, valueType: 'object'});
        }
    }
    return result;
}

const ruleProperty = getProperty(ruleNode.declarations[0].init.properties);
const responseProperty = getProperty(responseNode.declarations[0].init.properties);


// 接口描述行数
const descLine = actionNode.loc.start.line;
commentLines.add(descLine);
const allComment = getLineComment(docs, commentLines);

// 请求地址
apiDoc.url = 'demo';

// request parameters 请求参数
apiDoc.request = [];
for (const api of ruleProperty) {
    apiDoc.request.push({
        name: api.name,
        type: api.value[0].name === 'type' ? api.value[0].value : api.value[1].value,
        comment: allComment[api.commentLine]
    })
}

// 自定义处理的对象
const customObject = {};
const collectResponse = response => {
    const list = [];
    for (const api of response) {
        if (api.valueType === 'object') {
            // 当前仅支持key-value显示
            customObject[api.name] = collectResponse(api.value);
        }
        list.push({
            name: api.name,
            type: api.valueType,
            comment: allComment[api.commentLine],
        })
    }
    return list;
}

apiDoc.response = collectResponse(responseProperty);



// response parameters 响应参数
console.log(apiDoc, customObject, 'desc:', allComment[descLine]);


const generateMD = parameters => {
    if (parameters.length > 0) {
        let s = Buffer.from('字段 | 类型 | 说明\n---|---|---\n');
        for (const p of parameters) {
            s = Buffer.concat([s, Buffer.from(`${p.name} | ${p.type}| ${p.comment}\n`)]);
        }
        return s;
    }
    return Buffer.from('无');
}

const generateObject = obj => {
    let s = Buffer.from('');
    for (const k of Object.keys(obj)) {
        const head = Buffer.from(`#### ${k}\n`);
        const body = Buffer.from(generateMD(obj[k]));
        s = Buffer.concat([s, head, body]);
    }
    return s;
}

generateMD(apiDoc.request);

const content = `
### ${allComment[descLine]}
### POST
### 请求地址
${apiDoc.url}

### 请求参数
${generateMD(apiDoc.request).toString()}

### 返回参数(data 中数据)
${generateMD(apiDoc.response).toString()}

${generateObject(customObject).toString()}
`
console.log(content);

