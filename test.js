let message ="我找到了与 \"A-E-I-O-U\" 相关的主题，但没有具体的内容说明。如果你有特定的信息需求或者想让我搜索更具体的内容，请告诉我。";

console.log('Original length:', message.length);
console.log('Escaped backslashes:', message.match(/\\/g));

function unescapeCharacters(str) {
    // First handle escaped quotes
    console.log( str.match(/\\"/g));
    return str.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g, '\\$1');
}

const result = unescapeCharacters(message);
console.log('Result length:', result.length);
console.log('Original:', message);
console.log('Processed:', result);

console.log(`\\\\`);  