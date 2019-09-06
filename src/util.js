const fs = require('fs');
const path = require('path');

const deepGet = (object, path, defaultValue) => {
	return (!Array.isArray(path) ? path.replace(/\[/g, '.').replace(/\]/g, '').split('.') : path)
	.reduce((o, k) => (o || {})[k], object) || defaultValue;
};

// 首字母小写
const cLowercase = (str) => {
	return str.replace(str[0], str[0].toLowerCase());
};

// 所有路径首字母小写
const pathCLowercase = (path) => {
	return path.split('\/').map(str => {
		if (str) {
			return cLowercase(str)
		}
	}).join('\/')
};

// 递归创建目录 同步方法
const mkdirsSync = (dirname) => {
	if (fs.existsSync(dirname)) {
		return true;
	} else {
		if (mkdirsSync(nodePath.dirname(dirname))) {
			fs.mkdirSync(dirname);
			return true;
		}
	}
};

//封装深度克隆
const deepClone = (origin, target) => {
	var target = target || {},//设置target的默认值，不传值默认为空对象
		toStr = Object.prototype.toString,//原型链方法：判断数值类型
		arrStr = '[object Array]';

	for (var prop in origin) {
		if (origin.hasOwnProperty(prop)) {//判断对象下面是否有属性，没有属性的即为原始值

			if (origin[prop] !== 'null' && typeof (origin[prop]) === 'object') {//判断需要被克隆的对象的属性是否为原始值
				target[prop] = toStr.call(origin[prop]) === arrStr ? []:{};//不是原始值，将其转为数组或对象
				deepClone(origin[prop], target[prop]);//如果不是原始值，继续调用自身，判断该属性的子属性是否为原始值
			} else {
				target[prop] = origin[prop]; //如果是原始值的话，将其复制给克隆对象
			}
		}
	}
	return target
};

module.exports = {
	deepGet,
	cLowercase,
	pathCLowercase,
	mkdirsSync,
	deepClone,
};
