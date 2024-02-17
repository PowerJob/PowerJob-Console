module.exports = {
  // https://gitee.com/KFCFans/PowerJob/issues/I7MU6J
  publicPath: './',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:7700',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
}