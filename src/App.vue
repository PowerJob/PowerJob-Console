<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>

  export default {
    name: 'app'
  }
</script>

<style>
  #app {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei', 
                 '微软雅黑', sans-serif;
    background: var(--pj-bg-base);
    color: var(--pj-text-primary);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  a {
    color: var(--pj-primary);
    text-decoration: none;
    transition: color 0.3s ease;
    
    &:hover {
      color: var(--pj-primary-light);
    }
  }
  
  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  
  /* Focus styles */
  *:focus {
    outline: 2px solid var(--pj-primary);
    outline-offset: 2px;
  }
  
  .el-input__inner:focus,
  .el-textarea__inner:focus {
    border-color: var(--pj-primary) !important;
  }
</style>
