'use strict';

const {
	METHOD_METADATA,
	PATH_METADATA,
	BEFORE_METADATA,
	AFTER_METADATA,
	MESSAGE_METADATA,
	ERROR_MESSAGE_METADATA,
	IGNORE_JWT_METADATA,
	TAGS_METADATA,
	SUMMARY_METADATA,
	DESCRIPTION_METADATA,
	PARAMETERS_METADATA,
	RESPONSES_METADATA,
	PRODUCES_METADATA,
	CONSUMES_METADATA,
	HIDDEN_METADATA,
	TOKEN_TYPE_METADATA,
	RESPONSE_CODE_METADATA,
	RESPONSE_ERROR_CODE_METADATA,
	RENDER_METADATA } = require('../constants');
const RequestMethod = require('../enum/request-method');

const createMappingDecorator = Symbol('createMappingDecorator');
const createSingleDecorator = Symbol('createSingleDecorator');
const createArrayDecorator = Symbol('createArrayDecorator');
const mappingRequest = Symbol('mappingRequest');

// 3种创建装饰器的方式,Mapping、Array、single

class MethodHandler {
	constructor (cMap) {
		this.cMap = cMap;
	}

	getMetada (targetCb) {
		const reqMethod = Reflect.getMetadata(METHOD_METADATA, targetCb);
		const path = Reflect.getMetadata(PATH_METADATA, targetCb);
		const before = Reflect.getMetadata(BEFORE_METADATA, targetCb) || [];
		const after = Reflect.getMetadata(AFTER_METADATA, targetCb) || [];
		const responseMessage = Reflect.getMetadata(MESSAGE_METADATA, targetCb);
		const ignoreJwt = Reflect.getMetadata(IGNORE_JWT_METADATA, targetCb);
		const parameters = Reflect.getMetadata(PARAMETERS_METADATA, targetCb) || [];
		const responses = Reflect.getMetadata(RESPONSES_METADATA, targetCb);
		const tags = Reflect.getMetadata(TAGS_METADATA, targetCb);
		const summary = Reflect.getMetadata(SUMMARY_METADATA, targetCb);
		const description = Reflect.getMetadata(DESCRIPTION_METADATA, targetCb);
		const produces = Reflect.getMetadata(PRODUCES_METADATA, targetCb) || [ 'application/json' ];
		const consumes = Reflect.getMetadata(CONSUMES_METADATA, targetCb) || [ 'application/json' ];
		const hidden = Reflect.getMetadata(HIDDEN_METADATA, targetCb);
		const tokenType = Reflect.getMetadata(TOKEN_TYPE_METADATA, targetCb);
		const render = Reflect.getMetadata(RENDER_METADATA, targetCb);
		const responseCode = Reflect.getMetadata(RESPONSE_CODE_METADATA, targetCb);
		const responseErrorCode = Reflect.getMetadata(RESPONSE_ERROR_CODE_METADATA, targetCb);
		const responseErrorMessage = Reflect.getMetadata(ERROR_MESSAGE_METADATA, targetCb);
		return {
			responseCode,
			responseErrorCode,
			reqMethod,
			path,
			before,
			after,
			responseMessage,
			responseErrorMessage,
			ignoreJwt,
			parameters,
			responses,
			tags,
			summary,
			description,
			produces,
			consumes,
			hidden,
			tokenType,
			render
		};
	}

	get () {
		return this[createMappingDecorator](RequestMethod.GET);
	}

	post () {
		return this[createMappingDecorator](RequestMethod.POST);
	}

	put () {
		return this[createMappingDecorator](RequestMethod.PUT);
	}

	delete () {
		return this[createMappingDecorator](RequestMethod.DELETE);
	}

	patch () {
		return this[createMappingDecorator](RequestMethod.PATCH);
	}

	options () {
		return this[createMappingDecorator](RequestMethod.OPTIONS);
	}

	head () {
		return this[createMappingDecorator](RequestMethod.HEAD);
	}

	before () {
		return this[createArrayDecorator](BEFORE_METADATA);
	}

	after () {
		return this[createArrayDecorator](AFTER_METADATA);
	}

	produces () {
		return this[createArrayDecorator](PRODUCES_METADATA);
	}

	consumes () {
		return this[createArrayDecorator](CONSUMES_METADATA);
	}

	tags () {
		return this[createArrayDecorator](TAGS_METADATA);
	}

	message () {
		return this[createSingleDecorator](MESSAGE_METADATA);
	}

	errorMessage () {
		return this[createSingleDecorator](ERROR_MESSAGE_METADATA);
	}

	responseCode () {
		return this[createSingleDecorator](RESPONSE_CODE_METADATA);
	}

	responseErrorCode () {
		return this[createSingleDecorator](RESPONSE_ERROR_CODE_METADATA);
	}

	ignoreJwt () {
		return this[createSingleDecorator](IGNORE_JWT_METADATA)(true);
	}

	summary () {
		return this[createSingleDecorator](SUMMARY_METADATA);
	}

	description () {
		return this[createSingleDecorator](DESCRIPTION_METADATA);
	}

	parameters () {
		return this[createSingleDecorator](PARAMETERS_METADATA);
	}

	responses () {
		return this[createArrayDecorator](RESPONSES_METADATA);
	}

	hidden () {
		return this[createSingleDecorator](HIDDEN_METADATA)(true);
	}

	tokenType () {
		return this[createSingleDecorator](TOKEN_TYPE_METADATA);
	}

	render () {
		return this[createSingleDecorator](RENDER_METADATA)(true);
	}

	[createMappingDecorator] (method) {
		// 例如,调用@Get('/home'),这里的home就是path参数
		return path => {
			// 返回装饰器方法
			return this[mappingRequest]({
				[PATH_METADATA]: path,
				[METHOD_METADATA]: method,
			});
		};
	}

	// 返回一个Reflect方法
	[mappingRequest] (metadata) {
		const path = metadata[PATH_METADATA];
		const reqMethod = metadata[METHOD_METADATA];

		// 这个装饰器,定义的时候就会触发,这里给路由方法绑定2个元数据,以及缓存当前类
		return (target, key, descriptor) => {
			this.cMap.set(target, target);
			let method = Reflect.getMetadata(METHOD_METADATA, target[key]);
			if (method) {
				method += `,${reqMethod}`
			} else {
				method = reqMethod
			}
			Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);
			Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
			return descriptor;
		};
	}

	[createSingleDecorator] (metadata) {
		// 这里的values就是装饰器传入的参数
		return value => {
			return (target, key, descriptor) => {
				this.cMap.set(target, target);
				Reflect.defineMetadata(metadata, value, descriptor.value);
				return descriptor;
			};
		};
	}

	[createArrayDecorator] (metadata) {
		// 这里的values就是装饰器传入的参数
		return values => {
			// 返回装饰器函数
			return (target, key, descriptor) => {
				// 过反射拿到被装饰函数的源数据
				const _values = Reflect.getMetadata(metadata, descriptor.value) || [];
				// 如果装饰器传入的是一个元素,那么包装成数组
				values = (values instanceof Array) ? values : [ values ];
				// 扩展当前缓存元素的元数据
				values = values.concat(_values);
				Reflect.defineMetadata(metadata, values, descriptor.value);
				return descriptor;
			};
		};
	}
}

module.exports = MethodHandler;
