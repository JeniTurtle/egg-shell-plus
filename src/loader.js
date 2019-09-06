const path = require("path");
const fs = require('fs');

let CONTRACT;
const type = ['string', 'number', 'boolean', 'integer', 'array', 'file'];
const itemType = ['string', 'number', 'boolean', 'integer', 'array'];

/**
 * 构建responses对象
 * @param ctrlFullPath
 * @param ctrlPath
 * @param responses  示例格式 [{ statsu: 200, definition: 'User', description: 'fuck you'}]
 * @param definitions
 * @returns {{}}
 */
const generateResponse = (ctrlFullPath, ctrlPath, responses, definitions) => {
	let responseDoc = {};
	if (responses) {
		for (let response of responses) {
			if (!response.hasOwnProperty('definition')) {
				throw new Error(`[egg-swagger-doc] error at ${ctrlFullPath} ,the type of response parameter does not exit`);
			}
			let res = {};
			let schema = {};
			let status = response['status'] || 200;
			let difinition = ctrlPath.replace(/\//g, '.') + '.' + response['definition'];
			let description = response['description'] || '';

			if (!definitions.hasOwnProperty(difinition)) {
				throw new Error(`[egg-swagger-doc] error at ${ctrlFullPath} ,the type of response definition does not exit`);
			}
			schema.$ref = `#/definitions/${difinition}`;
			res.schema = schema;
			res.description = '';
			responseDoc[status] = res;
		}
	} else {
		responseDoc.default = { description: 'successful operation' };
	}
	return responseDoc;
};

const generateContract = (app, definitionPath, pathPrefix) => {
	CONTRACT = {};

	if (!fs.existsSync(definitionPath)) {
		app.logger.warn(`[egg-shell] can not found [${definitionPath}]`);
	}

	contractLoader(app, definitionPath, '', pathPrefix);
}

/**
 * 递归获取定义的difinition
 * @param {EggApplication} app Egg应用
 * @param {String} baseDir 根目录
 * @param {String} directory 相对目录
 */
const contractLoader = (app, baseDir, directory, pathPrefix) => {
	const contractDir = path.join(baseDir, directory).replace(/\\/g, '/');
	const names = fs.readdirSync(contractDir);

	for (let name of names) {
		const filepath = path.join(contractDir, name).replace(/\\/g, '/');
		const stat = fs.statSync(filepath);

		if (stat.isDirectory()) {
			contractLoader(app, contractDir, name, pathPrefix);
			continue;
		}

		if (stat.isFile() && ['.js', '.ts'].indexOf(path.extname(filepath)) !== -1) {
			const def = require(filepath.split(/\.(js|ts)/)[0]);
			const subPrefix = filepath.split(pathPrefix)[1].replace(/(\.ts)|(\.js)/g, '').substr(1)
			for (let object in def) {
				CONTRACT[subPrefix.replace(/\//g, '.') + '.' + object] = {
					path: pathPrefix + filepath.split(pathPrefix)[1],
					content: def[object],
				};
			}
		}
	}
};

/**
 * 构建definition
 * @param {object} source contract超集
 */
const buildDefinition = (source) => {
	let result = {};
	for (let object in source) {
		let target = {
			type: 'object',
			required: [],
			properties: {},
		};
		let def = source[object].content;
		let path = source[object].path;

		for (let field in def) {

			if (def[field].hasOwnProperty('required') && def[field].required) {
				target.required.push(field);
			}
			delete def[field].required;

			if (!def[field].hasOwnProperty('type')) {
				throw new Error(`[egg-shell] ${path}: ${object}.${field}.type is necessary`);
			}

			if (!type.includes(def[field].type)) {
				def[field]['$ref'] = `#/definitions/${def[field].type}`;
				delete def[field].type;
			}

			// #region 对array数组的处理
			if (def[field].type === 'array') {
				if (!def[field].hasOwnProperty('itemType')) {
					throw new Error(`[egg-shell] ${path}: ${object}.${field}.itemType is necessary`);
				}

				if (!itemType.includes(def[field].itemType)) {
					let itemType = { $ref: `#/definitions/${def[field].itemType}` };
					def[field]['items'] = itemType;
				} else {
					let itemType = { type: def[field].itemType };
					def[field]['items'] = itemType;
				}
				delete def[field].itemType;
			}

			// 移除swagger非必要的属性
			if (def[field].type !== 'string') {
				delete def[field].format;
			}

			if ((def[field].format !== 'date-time' && def[field].format !== 'date')) {
				delete def[field].format;
			}

			delete def[field].max;
			delete def[field].min;
			delete def[field].allowEmpty;
			delete def[field].test;
		}

		target.properties = def;
		result[object] = target;
	}
	return result;
}

const getDefinitions = (app, definitionPath) => {
	const absPath = path.join(__dirname, path.normalize('../../../' + definitionPath)).replace(/\\/g, '/')
	const pathPrefix = definitionPath.replace(/\./g, '').split('/').filter(i => !!i).join('/').replace(/\\/g, '/')

	if (!CONTRACT) {
		generateContract(app, absPath, pathPrefix);
	}

	let source = JSON.parse(JSON.stringify(CONTRACT));
	return buildDefinition(source);
};

module.exports = {
	generateResponse,
	getDefinitions,
};