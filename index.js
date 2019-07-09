'use strict';

require('reflect-metadata');
const _ = require('lodash');
const nodePath = require('path');
const fs = require('fs');
const parser = require('gitignore-parser');
const { toSwaggerParams, mixedValidate } = require('koa-swagger-joi')
const { registerRouter } = require('./src/router')
const { Joi } = require('koa-swagger-joi').default
const CUSTOM_MIDDLEWARE_NAME = 'customMiddlewares';

const StatusError = require('./src/exception/status-error');
const ControllerHandler = require('./src/handler/controller-handler');
const MethodHandler = require('./src/handler/method-handler');
const { deepGet, pathCLowercase, deepClone } = require('./src/util')
const { generateResponse, getDefinitions } = require('./src/loader')

const ctMap = new Map();
const ctHandler = new ControllerHandler();
const methodHandler = new MethodHandler(ctMap);
const swaggerHttpMethod = [ 'get', 'post', 'put', 'delete', 'patch' ];

const EggShell = (app, options = {}) => {
	const { router } = app;
	const ctrlFnList = [];

	// 设置全局路由前缀
	if (options.prefix) router.prefix(options.prefix);

	let swaggerJson = null;
	let validateSwaggerJson = null;
	// 开启swagger
	let swaggerOpt = null;

	if (options.swaggerOpt && options.swaggerOpt.open) {
		registerRouter(app);
		swaggerOpt = options.swaggerOpt;
		swaggerOpt.definitionPath = swaggerOpt.definitionPath || './app/definition';
		swaggerJson = {
			swagger: '2.0',
			info: {
				title: swaggerOpt.title || '',
				version: swaggerOpt.version || '',
			},
			basePath: swaggerOpt.basePath || (options.prefix === '/' ? '' : options.prefix),
			schemes: swaggerOpt.schemes || [ 'http' ],
			tags: [],
			paths: {},
			definitions: {}
		};
		validateSwaggerJson = deepClone(swaggerJson);

		// definition
		if (swaggerOpt.definitionPath) {
			const definition = getDefinitions(app, swaggerOpt.definitionPath);
			swaggerJson.definitions = definition;
			validateSwaggerJson.definitions = definition;
		}
	}

	for (const c of ctMap.values()) {
		// 获取控制器元数据
		let { ignoreJwtAll, prefix, tagsAll, beforeAll, afterAll, hiddenAll, renderController } = ctHandler.getMetada(c.constructor);
		// 获取类自定义的属性名和方法名
		const propertyNames = _.filter(Object.getOwnPropertyNames(c), pName => {
				return pName !== 'constructor' && pName !== 'pathName' && pName !== 'fullPath';
	});

		// 解析前缀
		const fullPath = c.fullPath.
		split('\\').join('/').
		replace(/[\/]{2,9}/g, '/').
		replace(/(\.ts)|(\.js)/g, '');
		const rootPath = 'controller/';
		const ctrlRootPath = fullPath.substring(fullPath.indexOf(rootPath) + rootPath.length);
		// 如果这个控制器没有通过装饰器设置prefix,就按照文件路径作为前缀
		prefix = prefix || ctrlRootPath;
		prefix = prefix.startsWith('/') ? prefix : '/' + prefix;

		// 获取swagger映射
		// let loadParameters = null;
		if (swaggerOpt && swaggerOpt.open) {
			if (tagsAll) {
				if (!tagsAll.name) tagsAll.name = prefix;
				swaggerJson.tags.push(tagsAll);
				validateSwaggerJson.tags.push(tagsAll);
			}
		}

		for (const pName of propertyNames) {
			// 解析函数元数据
			let {reqMethod, path = "", before, after, responseMessage, responseErrorMessage, responseCode, responseErrorCode, ignoreJwt, tags, summary, description, parameters, responses, produces, consumes, hidden, render} = methodHandler.getMetada(c[pName]);

			if (!reqMethod) {
				continue
			}

			reqMethod.split(',').forEach(requestMethod => {
				requestMethod = requestMethod.toLowerCase();

			if (swaggerOpt && swaggerOpt.open && !hiddenAll && !hidden) {
				let finallyPath = prefix + path;
				if (!path && pName !== 'index') {
					finallyPath += ("/" + pName)
				}

				finallyPath = pathCLowercase(replaceColon(finallyPath));
				let params = typeof parameters === 'function' ? parameters(finallyPath) : parameters;
				let validateParameters = params instanceof Array ? null : params;
				let swaggerParameters =  params instanceof Array ? params : toSwaggerParams(params);
				let swaggerResponses = generateResponse(fullPath, ctrlRootPath, responses, swaggerJson.definitions);

				if (options.jwtValidationName && !ignoreJwtAll && !ignoreJwt) {
					swaggerParameters.unshift({
						name: 'Authorization', in: 'header', description: 'Token', type: 'string'
					});
				}

				if (swaggerHttpMethod.indexOf(requestMethod) >= 0) {
					if (!swaggerJson.paths[finallyPath]) {
						swaggerJson.paths[finallyPath] = {};
						validateSwaggerJson.paths[finallyPath] = {};
					}

					const swaggerPaths = {
						tags: ((tags && !Array.isArray(tags)) ? [tags] : tags) || [prefix],
						summary: summary || description,
						description,
						produces: (produces && !Array.isArray(produces)) ? [produces] : produces,
						consumes: (consumes && !Array.isArray(consumes)) ? [consumes] : consumes,
						responses: swaggerResponses
					};
					swaggerJson.paths[finallyPath][requestMethod] = { ...swaggerPaths, parameters: swaggerParameters }
					validateSwaggerJson.paths[finallyPath][requestMethod] = { ...swaggerPaths, parameters: validateParameters }
				}
			}

			const routerCb = async(ctx, next) => {
				// 实例化控制器类
				const instance = new c.constructor(ctx);
				try {
					ctx.body = ctx.request ? ctx.request.body : null;
					ctx.ctrlInfo = {
						responseCode,
						responseErrorCode,
						responseMessage,
						responseErrorMessage,
						result: null
					};

					// 执行控制器中的action方法, 并把返回结果绑定到ctx上
					const result = await instance[pName](ctx, next);

					// 只有开启自动返回内容选项, 才会自动调用后面的中间件。不然得在控制器里自己调用next方法
					if (options.autoResponse && !render && !renderController) {
						ctx.ctrlInfo.result = result;

						// 注意! 如果控制器有return结果, 那么我们这里强制调用一次next方法, 确保中间件继续往下走
						if (result !== undefined) {
							await next()
						}
					}
				} catch (error) {
					throw error
				}
			};

			const { routerAfterMiddleware: afterList = [], routerBeforeMiddleware: beforeList = [] } = app.config;

			const getMiddlewareList = arr => arr.map(item => {
				const pathList = pathCLowercase(item.replace('.', '/')).split('/');
			const fn = deepGet(app.middlewares, pathList);
			const config = deepGet(app.config, item.split('.')) || deepGet(app.config, pathList)
			if (fn) {
				return fn(config, app)
			}
		}).filter(item => !!item);

			var ctrlBefores = getMiddlewareList(beforeAll);
			var ctrlAfters = getMiddlewareList(afterAll);
			var actBefores = getMiddlewareList(before);
			var actAfters = getMiddlewareList(after);

			const afterWares = getMiddlewareList(afterList);
			const beforeWares = getMiddlewareList(beforeList.filter(name => {
					// 判断该路由是否忽略jwt效验, 如果忽略就跳过
					return !(((options.jwtValidationName === name || options.jwtValidationName === name.replace(name[0], name[0].toUpperCase()))
					&& (ignoreJwt || ignoreJwtAll)))
				}));

			const finalBefores = beforeWares.concat(ctrlBefores).concat(actBefores);
			const finalAfters = actAfters.concat(ctrlAfters).concat(afterWares);

			const rtFn = ((_prefix, _path, _pName, _reqMethod, _finalBefores, _finalAfters, _routerCb) => () => {
				const routerPath = pathCLowercase(nodePath.join(_prefix, _path || _pName));
				let routerIndexPath;

				router[_reqMethod](routerPath, ..._finalBefores, _routerCb, ..._finalAfters);

				if (_pName === "index") {
					routerIndexPath = pathCLowercase(nodePath.join(_prefix, _path || ""))
					router[_reqMethod](routerIndexPath, ..._finalBefores, _routerCb, ..._finalAfters);
				}

				if (options.defaultIndex === routerPath || options.defaultIndex === routerIndexPath) {
					router.get('/', ..._finalBefores, _routerCb, ..._finalAfters);
				}
			})(prefix, path, pName, requestMethod, finalBefores, finalAfters, routerCb)

			ctrlFnList.push(rtFn)
		});
		}
	}

	app.use(mixedValidate(validateSwaggerJson));

	ctrlFnList.map(fn => fn());

	if (swaggerOpt && swaggerOpt.open) {
		const outPath = nodePath.join(nodePath.join(__dirname, './public/swagger-ui/json/api-docs.json'));

		try {
			fs.statSync(outPath);
			fs.writeFileSync(outPath, JSON.stringify(swaggerJson), { encoding: 'utf8' });
		} catch(e) {
			throw e
		}
	}

	return app
};

const paramsRegex = /:[\w-]*/g;

function replaceColon (path) {
	const matchs = paramsRegex.exec(path);
	if (!matchs) return path;
	const pathItem = matchs[0].replace(':', '{') + '}';
	path = path.replace(matchs[0], pathItem);
	return replaceColon(path);
}

module.exports = {
	CUSTOM_MIDDLEWARE_NAME,
	Joi,
	EggShell,
	StatusError,

	Get: methodHandler.get(),
	Post: methodHandler.post(),
	Put: methodHandler.put(),
	Delete: methodHandler.delete(),
	Patch: methodHandler.patch(),
	Options: methodHandler.options(),
	Head: methodHandler.head(),

	Before: methodHandler.before(),
	After: methodHandler.after(),
	ResponseMessage: methodHandler.message(),
	ResponseErrorMessage: methodHandler.errorMessage(),
	ResponseCode: methodHandler.responseCode(),
	ResponseErrorCode: methodHandler.responseErrorCode(),
	IgnoreJwt: methodHandler.ignoreJwt(),

	// Tags: methodHandler.tags(),
	Summary: methodHandler.summary(),
	Description: methodHandler.description(),
	Parameters: methodHandler.parameters(),
	Responses: methodHandler.responses(),
	Produces: methodHandler.produces(),
	Consumes: methodHandler.consumes(),
	Hidden: methodHandler.hidden(),
	// TokenType: methodHandler.tokenType(),
	Render: methodHandler.render(),

	IgnoreJwtAll: ctHandler.ignoreJwtAll(),
	BeforeAll: ctHandler.beforeAll(),
	AfterAll: ctHandler.afterAll(),
	Prefix: ctHandler.prefix(),
	TagsAll: ctHandler.tagsAll(),
	HiddenAll: ctHandler.hiddenAll(),
	TokenTypeAll: ctHandler.tokenTypeAll(),
	RenderController: ctHandler.renderController()
};
