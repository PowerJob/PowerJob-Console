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
    height: 100%;
  }
  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden; 
    font-family: Helvetica, ‘Hiragino Sans GB’, ‘Microsoft Yahei’, ‘微软雅黑’,
    Arial, sans-serif;
    background: #f0f3f4;
  }
  a {
    color: #303133;
    text-decoration: none;
  }
</style>
