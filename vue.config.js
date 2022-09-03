module.exports = {
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