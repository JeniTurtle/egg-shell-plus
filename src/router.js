const path = require('path')
const staticCache = require('koa-static-cache')

module.exports = {
	registerRouter: app => {
		// swaggerUI的静态资源加入缓存，配置访问路由
		const swaggerH5 = path.join(__dirname, '../public');
		app.use(staticCache(swaggerH5, {}, {}));
		app.logger.info('[egg-shell] register router: get /swagger-ui/index.html');
	}
};