<template>
    <div>
        容器模版生成器，参考：https://start.spring.io/
        需要上传的参数如下：
        private String group;
        private String artifact;
        private String name;
        private String packageName;
        private Integer javaVersion;

        接口文档：http://115.159.215.229:7700/swagger-ui.html#/container-controller/downloadContainerTemplateUsingPOST
    </div>
</template>

<script>
    export default {
        name: "ContainerTemplate"
    }
</script>

<style scoped>

</style>
