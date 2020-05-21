<template>
    <el-card class="box-card">
        <el-form ref="form" :model="form" label-width="150px" class="genTable" label-position='left'>
            <el-form-item label="Group">
                <el-input v-model="form.group"></el-input>
            </el-form-item>
            <el-form-item label="Artifact">
                <el-input v-model="form.artifact"></el-input>
            </el-form-item>
            <el-form-item label="Name">
                <el-input v-model="form.name"></el-input>
            </el-form-item>
            <el-form-item label="Package name">
                <el-input v-model="form.packageName"></el-input>
            </el-form-item>
            <el-form-item label="Java Version">
                <el-radio-group v-model="form.javaVersion">
                <el-radio label="8"></el-radio>
                <el-radio label= "11"></el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="onSubmit">Generate</el-button>
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script>
    export default {
        name: "ContainerTemplate",
        data() {
            return {
                form: {
                    group:'',
                    artifact: '',
                    name: '',
                    packageName: '',
                    javaVersion: "",
                }
            }
        },
        methods: {
            onSubmit() {
                 console.log('submit!');
                this.flyio.post("/container/downloadContainerTemplate", this.form
                ,{
                    responseType:'blob'//服务器返回的数据类型
                }).then((res)=>{
                    const content = res.data
                    const blob = new Blob([content])//构造一个blob对象来处理数据
                    const fileName = 'template.zip'

                    //对于<a>标签，只有 Firefox 和 Chrome（内核） 支持 download 属性
                    //IE10以上支持blob但是依然不支持download
                    if ('download' in document.createElement('a')) { //支持a标签download的浏览器
                        const link = document.createElement('a')//创建a标签
                        link.download = fileName//a标签添加属性
                        link.style.display = 'none'
                        link.href = URL.createObjectURL(blob)
                        document.body.appendChild(link)
                        link.click()//执行下载
                        URL.revokeObjectURL(link.href) //释放url
                        document.body.removeChild(link)//释放标签
                    } else { //其他浏览器
                        navigator.msSaveBlob(blob, fileName)
                    }
                  }).catch((err)=>{
                    console.log(err);
                 })
            }
        }
    }
</script>

<style scoped>
.genTable{
    padding:20px;
    min-width: 500px;
    width: 500px;
}
</style>
