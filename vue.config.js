module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://211.159.187.214:7700',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
}