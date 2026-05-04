const fs = require('fs');
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node gen_b64.js <local_file> <remote_path>');
    process.exit(1);
}
const localFile = args[0];
const remotePath = args[1];
const content = fs.readFileSync(localFile, 'utf8');
const code = `const fs = require('fs');
fs.writeFileSync('${remotePath}', Buffer.from('${Buffer.from(content).toString('base64')}', 'base64').toString('utf8'));
`;
console.log(Buffer.from(code).toString('base64'));
