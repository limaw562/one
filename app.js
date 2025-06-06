const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');

const app = express();

// Cache for proxy instances
const proxyCache = new Map();

// Factory function to build or reuse proxy middleware
function getProxyMiddleware(targetUrl) {
  if (proxyCache.has(targetUrl)) {
    return proxyCache.get(targetUrl);
  }

  const parsedUrl = url.parse(targetUrl);
  const prefixToRemove = `/${targetUrl.split('/').slice(0, 3).join('/')}`;

  const middleware = createProxyMiddleware({
    target: `${parsedUrl.protocol}//${parsedUrl.host}`,
    changeOrigin: true,
    pathRewrite: {
      [`^${prefixToRemove}`]: '',
    },
    onProxyReq: (proxyReq, req, res) => {
      const privacyHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip',
        'cf-ipcountry',
        'cf-worker',
        'true-client-ip',
        'forwarded',
        'via',
        'x-cluster-client-ip',
        'x-forwarded-host',
        'x-forwarded-proto',
        'x-originating-ip',
        'x-remote-ip',
        'x-remote-addr',
        'x-envoy-external-address',
        'x-amzn-trace-id',
        'x-request-id',
        'x-correlation-id',
      ];
      privacyHeaders.forEach((header) => proxyReq.removeHeader(header));
    },
    onProxyRes: (proxyRes, req, res) => {
      const privacyHeaders = [
        'x-powered-by',
        'server',
        'x-request-id',
        'x-correlation-id',
        'x-amzn-trace-id',
        'via',
        'cf-ray',
        'x-envoy-upstream-service-time',
      ];
      privacyHeaders.forEach((header) => delete proxyRes.headers[header]);
    },
  });

  proxyCache.set(targetUrl, middleware);
  return middleware;
}

// Middleware handling dynamic proxy
app.use('/', (req, res, next) => {
  // 获取请求路径，去除开头的斜杠
  const path = req.url.substring(1);
  
  // 检查路径是否是有效的URL
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    return res.status(400).send('闲人免进啊，兄弟！');
  }

  // 获取或创建代理中间件
  const apiProxy = getProxyMiddleware(path);

  // 应用代理到当前请求
  return apiProxy(req, res, next);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`不许进来看啦`);
  console.log(`闲人免进啊，兄弟！`);
});
