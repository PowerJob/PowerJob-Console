<template>
    <div>
        <el-card class="box-card">
        <div slot="header" class="clearfix">
            <span></span>
            <el-button style="float: right; " type="primary" @click="dialogVisible=true">{{$t('message.newContainer')}}</el-button>
        </div>
        <div class="wrapper">
            <div v-for="(item,key) in containerList" :key="key" class="item">
                <div class="containerText"><span class='value'>{{$t('message.containerId')}}</span><span class='value'>{{item.id}}</span></div>
                <div class="containerText"><span class='value'> {{$t('message.containerName')}} </span><span class='value'>{{item.containerName}}</span></div>
                <div class="containerText"><span class='value'>{{$t('message.containerType')}} </span><span class='value'>{{item.sourceType}}</span></div>
                <div class="containerText"><span class='value'>{{$t('message.containerVersion')}} </span><span class='value'>{{item.version}}</span></div>
                <div class="containerText"><span class='value'>{{$t('message.deployTime')}} </span><span class='value'>{{item.lastDeployTime}}</span></div>
                <div class="containerText"><span class='value'>{{$t('message.status')}} </span><span class='value'>{{item.status}}</span></div>
                <div style="width:240px;margin:0 auto">
                    <div class="btnWrap"><el-button type="primary" @click="arrangeItem(item)">{{$t('message.deploy')}}</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="editItem(item)">{{$t('message.edit')}}</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="deleteItem(item,key)">{{$t('message.delete')}}</el-button></div>
                    <div class="btnWrap"><el-button type="primary" @click="listOfItem(item)">{{$t('message.deployedWorkerList')}}</el-button></div>
            </div>
        </div>
        </div>
        </el-card>
            <el-dialog
                :title="$t('message.newContainer')"
                :visible.sync="dialogVisible"
                width="50%"
                v-on:close="closeEdit"
                :before-close="handleClose">
                <el-form ref="form" :model="form" label-width="150px" class="genTable" label-position='left'>
                    <el-form-item :label="$t('message.containerName')">
                        <el-input v-model="form.containerName"></el-input>
                    </el-form-item>
                    <el-form-item :label="$t('message.containerType')">
                        <el-radio-group v-model="form.sourceType">
                        <el-radio label="Git"></el-radio>
                        <el-radio label="FatJar"></el-radio>
                        </el-radio-group>
                    </el-form-item>
                <el-form  v-if="form.sourceType=='Git'" ref="gitform" :model="gitForm" label-width="150px" class="gitTable" label-position='left'>
                    <el-form-item :label="$t('message.containerGitURL')">
                        <el-input v-model="gitForm.repo"></el-input>
                    </el-form-item>
                    <el-form-item :label="$t('message.branchName')">
                        <el-input v-model="gitForm.branch"></el-input>
                    </el-form-item>
                    <el-form-item :label="$t('message.username')">
                        <el-input v-model="gitForm.username"></el-input>
                    </el-form-item>
                    <el-form-item :label="$t('message.password')">
                        <el-input v-model="gitForm.password"></el-input>
                    </el-form-item>
                </el-form>
                <el-form-item v-if="form.sourceType=='FatJar'">
                    <el-upload
                        class="upload-demo"
                        drag
                        :file-list = "fileList"
                        :on-success="onSuccess"
                        :action="`${requestUrl}/container/jarUpload`"
                        multiple>
                    <i class="el-icon-upload"></i>
                    <div class="el-upload__text">Drag the file here, or <em>click on Upload</em></div>
                    <div class="el-upload__tip" slot="tip">{{$t('message.uploadTips')}}</div>
                    </el-upload>
                </el-form-item>
                <el-form-item>
                        <el-button type="primary" @click="onSubmit" :disabled="form.sourceType=='FatJar' && !this.sourceInfo">Save</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
            <el-dialog :title="arrangeTitle" :visible.sync="arrangeVisible" v-on:close="closeArrange"  >
                <h4 v-for="log in logs" :key="log">{{log}}</h4>
            </el-dialog>
    </div>

</template>

<script>
    import baseUrl from '../../main';

    let ws;
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
                arrangeTitle:'',
                arrangeVisible:false,
                containerList:[],
                logs:[],
                requestUrl :"",
                fileList: []
            }
        },
        methods: {
            onSubmit() {
                // 接口参数
                let data = {
                    appId:this.appId,
                    containerName :this.form.containerName,
                    status:"ENABLE",
                    id:this.id,
                    sourceType:this.form.sourceType,
                };
               if(this.form.sourceType =='Git'){
                   data.sourceInfo = JSON.stringify(this.gitForm)
               }
               else{
                   data.sourceInfo = this.sourceInfo;
                   data.sourceType = 'FatJar'
               }
               this.axios.post("container/save",data).then(()=>{
                   let appId = this.$store.state.appInfo.id;
                   this.axios.get("/container/list?appId=" + appId).then(res => {
                       this.$message.info(this.$t('message.success'));
                       // 恢复默认表单
                       this.dialogVisible = false;
                       this.form.containerName = '';
                       this.gitForm = {};
                       this.sourceInfo = '';
                       this.id = '';
                       // 刷新容器表单
                       this.containerList = res;
                   });
               });
            },
            // 文件上传成功后 修改来源信息
            onSuccess(response){
                this.sourceInfo = response.data;
            },
            deleteItem(item,index){
                let appId = this.$store.state.appInfo.id;
                this.flyio.get("/container/delete?containerId="+ item.id+'&appId='+appId).then(res => {
                    console.log(res);
                    this.containerList.splice(index,1);
                    this.$message.info(this.$t('message.success'));
                });
            },
            editItem(item){
                if(item.sourceType == 'Git'){
                    this.form.sourceType ='Git';
                    this.gitForm = JSON.parse(item.sourceInfo);
                }
                else{
                    this.form.sourceType ='FatJar';
                }
                this.form.containerName = item.containerName;
                this.id = item.id;
                this.dialogVisible = true;
            },
            arrangeItem(item){
                let wsBase = this.requestUrl.replace("http","ws") + "/container/deploy/";
                let wsUrl = wsBase + item.id;
                ws = new WebSocket(wsUrl);

                ws.onopen = ()=> {
                    this.arrangeTitle = this.$t('message.deploy');
                    this.arrangeVisible = true;
                        console.log("Connection open ...");
                        ws.send("Hello WebSockets!");
                    };

                ws.onmessage = (evt)=> {
                    this.logs.push(evt.data);
                };

                ws.onclose = ()=>{
                    console.log("Connection closed.");
                };
            },
            // 关闭部署页面时 关闭ws避免dialog内的信息有上台机器信息
            closeArrange(){
                ws.close();
                this.logs = [];
            },
            closeEdit(){
                this.sourceInfo = '';
                this.fileList  = [];
            },
            listOfItem(item){
                let appId = this.$store.state.appInfo.id;
                this.flyio.get("/container/listDeployedWorker?containerId="+ item.id+'&appId='+appId).then(res => {
                    if(res.data.data){
                        this.logs = res.data.data.split('\n');
                        this.arrangeTitle = this.$t('message.deployedWorkerList');
                        this.arrangeVisible = true;
                    }
                    // this.containerList.splice(index,1);
                    // this.$message(`容器${item.containerName}已删除`);
                });
            },
            // 兼容 java build in 模式下 baseURL 为 / 的情况（将当前url作为请求路径）
            calculateRequestUrl() {
                if (baseUrl === undefined || !baseUrl.includes("http")) {
                    let url  =  window.location.href;
                    let urlSplit= url.split('//'); // str1[0]--协议头
                    let ip = urlSplit[1].split('/')[0];
                    this.requestUrl = urlSplit[0] + '//' + ip;
                    console.log("calculateRequestUrl: " + this.requestUrl);
                }else {
                    this.requestUrl = baseUrl;
                }
            }
        },
        mounted() {
            this.calculateRequestUrl();

            let appId = this.$store.state.appInfo.id;
            this.flyio.get("/container/list?appId=" + appId).then(res => {
                console.log(res);
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
      margin-left: 20px;
  }
  .el-dialog{
      height: 100vh;
  }
</style>
