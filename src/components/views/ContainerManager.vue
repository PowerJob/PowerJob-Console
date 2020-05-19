<template>
    <div>
        <el-card class="box-card">
        <div slot="header" class="clearfix">
            <span></span>
            <el-button style="float: right; " type="primary" @click="dialogVisible=true">新增容器</el-button>
        </div>
        <div class="wrapper">
            <div v-for="(item,key) in containerList" :key="key" class="item">
                <div class="containerText"><span>容器名称：</span> <span class='value'>{{item.containerName}}</span></div>
                <div class="containerText"><span>地址类型：</span> <span class='value'>{{item.sourceType}}</span></div>
                <div class="containerText"><span>文件版本：</span> <span class='value'>{{item.version}}</span></div>
                <div style="width:240px;margin:0 auto">
                    <div class="btnWrap"><el-button type="primary" @click="1">部署</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="editItem(item,key)">编辑</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="deleteItem(item,key)">删除</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="1">机器列表</el-button></div>
            </div>
        </div>
        </div>
        </el-card>
            <el-dialog
                title="新增容器"
                :visible.sync="dialogVisible"
                width="50%"
                :before-close="handleClose">
                <el-form ref="form" :model="form" label-width="150px" class="genTable" label-position='left'>
                    <el-form-item label="Container Name">
                        <el-input v-model="form.containerName"></el-input>
                    </el-form-item>
                    <el-form-item label="地址类型">
                        <el-radio-group v-model="form.sourceType">
                        <el-radio label="Git"></el-radio>
                        <el-radio label="fatJar"></el-radio>
                        </el-radio-group>
                    </el-form-item>
                <el-form  v-if="form.sourceType=='Git'" ref="gitform" :model="gitForm" label-width="150px" class="gitTable" label-position='left'>
                    <el-form-item label="Git仓库地址">
                        <el-input v-model="gitForm.repo"></el-input>
                    </el-form-item>
                    <el-form-item label="分支名称">
                        <el-input v-model="gitForm.branch"></el-input>
                    </el-form-item>
                    <el-form-item label="用户名">
                        <el-input v-model="gitForm.username"></el-input>
                    </el-form-item>
                    <el-form-item label="密码">
                        <el-input v-model="gitForm.password"></el-input>
                    </el-form-item>
                </el-form>
                <el-form-item v-if="form.sourceType=='fatJar'">
                    <el-upload
                        class="upload-demo"
                        drag
                        :on-success="onSuccess"
                        action="http://101.132.101.215:7700/container/jarUpload"
                        multiple>
                    <i class="el-icon-upload"></i>
                    <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
                    <div class="el-upload__tip" slot="tip">拖拽或点击文件后会自动上传</div>
                    </el-upload>
                </el-form-item>
                <el-form-item>
                        <el-button type="primary" @click="onSubmit">Save</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
    </div>

</template>

<script>
    export default {
        name: "ContainerManager",
        data() {
            return {
                form: {
                    sourceType:'Git',
                    containerName: '',
                },
                gitForm:{
                    repo:'',
                    branch:'',
                    username:'',
                    password:'',
                },
                sourceInfo : '',
                id:'',
                appId:this.$store.state.appInfo.id,
                dialogVisible:false,
                containerList:[],
            }
        },
        methods: {
            onSubmit() {
                let data = {
                    appId:1, //this.appId
                    containerName :this.form.containerName,
                    status:"ENABLE",
                    id:this.id,
                    sourceType:this.form.sourceType,
                }
               if(this.form.sourceType =='Git'){
                   data.sourceInfo = JSON.stringify(this.gitForm)
               }
               else{
                   data.sourceInfo = this.sourceInfo;
                   data.sourceType = 'JarFile'
               }
               this.flyio.post("container/save",data).then(res=>{
                   console.log(res);
                   if(res.data.success){
                       console.log(1);
                        let appId = this.$store.state.appInfo.id;
                        appId = appId || 1 ;  // 测试默认1
                        this.flyio.get("/container/list?appId=" + appId).then(res => {
                            if(res.data.success){
                            this.$message('成功创建/修改容器～');
                            this.containerList = res.data.data;
                        }
                     });
                   }
                   else{
                       this.$message('创建容器失败～');
                   }
               });
            },
            onSuccess(response){
                this.sourceInfo = response.data;
            },
            deleteItem(item,index){
                let appId = this.$store.state.appInfo.id;
                appId = appId || 1 ;  // 测试默认1
                this.flyio.get("/container/delete?containerId="+ item.id+'&appId='+appId).then(res => {
                    console.log(res)
                    this.containerList.splice(index,1);
                    this.$message(`容器${item.containerName}已删除`);
                });
            },
            editItem(item){

                if(item.sourceType == '2'){
                    this.form.sourceType ='Git';
                    this.gitForm = JSON.parse(item.sourceInfo);
                }
                else{
                    this.form.sourceType ='fatJar';
                }
                this.form.containerName = item.containerName;
                this.id = item.id;
                this.dialogVisible = true;
            }
        },
        mounted() {
            let appId = this.$store.state.appInfo.id;
            appId = appId || 1 ;  // 测试默认1
            this.flyio.get("/container/list?appId=" + appId).then(res => {
                console.log(res)
                if(res.data.success){
                    this.containerList = res.data.data;
                }
            });
        }
    }
</script>

<style scoped>
.genTable{
    padding:20px;
    min-width: 500px;
    width: 500px;
}
 .clearfix:before,
  .clearfix:after {
    display: table;
    content: "";
  }
  .clearfix:after {
    clear: both
  }
  .wrapper{
      display: flex;
      flex-wrap: wrap;
  }
  .item{
      flex:0 0 340px;
      margin-right:20px;
      margin-bottom:20px;
      background-color: #f0f0f0;
  }
  .item button{
      width:100px;
      margin:0 auto;
  }
  .btnWrap{
      width:50%;
      float: left;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
  }
  .containerText{
      margin: 20px;
      font-size: 16px;
      box-sizing: border-box;

  }
  .value{
      display: inline-block;
      max-width: 200px;
      overflow:hidden;
  }
</style>
