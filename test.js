var parser = require('gitignore-parser'),
	fs = require('fs');

var arr = [  // 自动生成路由时, 忽略这些文件, 忽略规则采用.gitignore
	'archive/*',
	'class/*',
	'resource/*',
	'rule/*',
	'supreme/*',
	'device.ts',
	'eureka.ts',
	'message.ts',
	'qiniu.ts',
	'school.ts',
	'statistics.ts',
	'test.ts',
	'version.ts',
	'wechat.ts',
];

var dirs = arr.join('\n');
// var gitignore = parser.compile(fs.readFileSync('.gitignore', 'utf8'));
var gitignore = parser.compile(dirs);

gitignore.accepts('LICENSE.md') === true;
gitignore.denies('LICENSE.md') === false;

gitignore.accepts('node_modules/mocha/bin') === false;
gitignore.denies('node_modules/mocha/bin') === true;


var files = [
	'/archive/test/test.ts',
	'package.json',
	'.gitignore',
	'.travis.yml',
	'LICENSE.md',
	'README.md',
	'lib/index.js',
	'test/index.js',
	'test/mocha.opts',
	'node_modules/mocha/bin/mocha',
	'node_modules/mocha/README.md'
];

// only files that are not gitignored
const f1 = files.filter(gitignore.accepts);

// only files that *are* gitignored
const f2 = files.filter(gitignore.denies);

console.log(f1)
console.log(f2)