<template>
    <div class="container-manager">
        <!-- Header Section -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="page-title">{{$t('message.containerManagement') || '容器运维'}}</h1>
                <p class="page-description">{{$t('message.containerDescription') || '管理和部署您的容器应用'}}</p>
            </div>
            <div class="header-actions">
                <el-button type="primary" size="large" @click="dialogVisible=true">
                    <el-icon><Plus /></el-icon>
                    {{$t('message.newContainer')}}
                </el-button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-section" v-if="containerList.length > 0">
            <el-row :gutter="20">
                <el-col :xs="24" :sm="12" :md="6">
                    <el-card class="stats-card">
                        <div class="stat-content">
                            <div class="stat-number">{{containerList.length}}</div>
                            <div class="stat-label">{{$t('message.totalContainers') || '总容器数'}}</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                    <el-card class="stats-card">
                        <div class="stat-content">
                            <div class="stat-number">{{enabledContainers}}</div>
                            <div class="stat-label">{{$t('message.enabledContainers') || '已启用'}}</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                    <el-card class="stats-card">
                        <div class="stat-content">
                            <div class="stat-number">{{gitContainers}}</div>
                            <div class="stat-label">{{$t('message.gitContainers') || 'Git容器'}}</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                    <el-card class="stats-card">
                        <div class="stat-content">
                            <div class="stat-number">{{jarContainers}}</div>
                            <div class="stat-label">{{$t('message.jarContainers') || 'JAR容器'}}</div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>

        <!-- Container Grid -->
        <div class="container-grid">
            <div v-if="loading" class="loading-state">
                <el-skeleton :rows="3" animated />
            </div>
            <div v-else-if="containerList.length === 0" class="empty-state">
                <el-empty :description="$t('message.noContainers') || '暂无容器'">
                    <el-button type="primary" @click="dialogVisible=true">
                        <el-icon><Plus /></el-icon>
                        {{$t('message.createFirst') || '创建第一个容器'}}
                    </el-button>
                </el-empty>
            </div>
            <el-row v-else :gutter="20">
                <el-col v-for="(item,key) in containerList" :key="key" :xs="24" :sm="12" :lg="8" :xl="6">
                    <el-card class="container-card" :class="{'container-disabled': item.status !== 'ENABLE'}">
                        <!-- Card Header -->
                        <template #header>
                            <div class="card-header">
                                <div class="container-info">
                                    <h3 class="container-name">{{item.containerName}}</h3>
                                    <div class="container-id">ID: {{item.id}}</div>
                                </div>
                                <div class="container-status">
                                    <el-tag 
                                        :type="item.status === 'ENABLE' ? 'success' : 'info'"
                                        size="small"
                                        effect="light">
                                        {{item.status}}
                                    </el-tag>
                                </div>
                            </div>
                        </template>

                        <!-- Card Body -->
                        <div class="container-details">
                            <div class="detail-row">
                                <div class="detail-label">
                                    <el-icon><Box /></el-icon>
                                    {{$t('message.containerType')}}
                                </div>
                                <div class="detail-value">
                                    <el-tag :type="item.sourceType === 'Git' ? 'primary' : 'warning'" size="small">
                                        {{item.sourceType}}
                                    </el-tag>
                                </div>
                            </div>
                            <div class="detail-row" v-if="item.version">
                                <div class="detail-label">
                                    <el-icon><Promotion /></el-icon>
                                    {{$t('message.containerVersion')}}
                                </div>
                                <div class="detail-value">
                                    <el-tooltip v-if="item.version && item.version.length > 20" :content="item.version" placement="top">
                                        <span class="version-text">{{item.version}}</span>
                                    </el-tooltip>
                                    <span v-else>{{item.version}}</span>
                                </div>
                            </div>
                            <div class="detail-row" v-if="item.lastDeployTime">
                                <div class="detail-label">
                                    <el-icon><Clock /></el-icon>
                                    {{$t('message.deployTime')}}
                                </div>
                                <div class="detail-value">{{formatTime(item.lastDeployTime)}}</div>
                            </div>
                        </div>

                        <!-- Card Actions -->
                        <div class="container-actions">
                            <el-button-group>
                                <el-button 
                                    type="primary" 
                                    size="small"
                                    @click="arrangeItem(item)"
                                    :loading="deployingItems.includes(item.id)">
                                    <el-icon><VideoPlay /></el-icon>
                                    {{$t('message.deploy')}}
                                </el-button>
                                <el-button 
                                    type="default" 
                                    size="small"
                                    @click="editItem(item)">
                                    <el-icon><Edit /></el-icon>
                                    {{$t('message.edit')}}
                                </el-button>
                            </el-button-group>
                            <el-dropdown @command="handleCommand" trigger="click">
                                <el-button type="default" size="small">
                                    <el-icon><More /></el-icon>
                                </el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item :command="{action: 'workers', item}">
                                            <el-icon><Monitor /></el-icon>
                                            {{$t('message.deployedWorkerList')}}
                                        </el-dropdown-item>
                                        <el-dropdown-item :command="{action: 'delete', item, index: key}" divided>
                                            <el-icon><Delete /></el-icon>
                                            {{$t('message.delete')}}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
        <!-- Create/Edit Container Dialog -->
        <el-dialog
            :title="id ? $t('message.editContainer') || '编辑容器' : $t('message.newContainer')"
            v-model="dialogVisible"
            width="600px"
            :close-on-click-modal="false"
            v-on:close="closeEdit">
            <el-form 
                ref="formRef" 
                :model="form" 
                :rules="formRules"
                label-width="120px" 
                class="container-form">
                
                <!-- Container Name -->
                <el-form-item :label="$t('message.containerName')" prop="containerName">
                    <el-input 
                        v-model="form.containerName" 
                        :placeholder="$t('message.containerNamePlaceholder') || '请输入容器名称'"
                        size="large">
                        <template #prepend>
                            <el-icon><Box /></el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <!-- Container Type -->
                <el-form-item :label="$t('message.containerType')" prop="sourceType">
                    <el-radio-group v-model="form.sourceType" size="large">
                        <el-radio-button label="Git">
                            <el-icon><Folder /></el-icon>
                            Git Repository
                        </el-radio-button>
                        <el-radio-button label="FatJar">
                            <el-icon><Document /></el-icon>
                            Fat JAR
                        </el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <!-- Git Configuration -->
                <el-card v-if="form.sourceType=='Git'" class="config-card" shadow="never">
                    <template #header>
                        <div class="config-header">
                            <el-icon><Folder /></el-icon>
                            <span>{{$t('message.gitConfiguration') || 'Git 配置'}}</span>
                        </div>
                    </template>
                    
                    <el-form ref="gitFormRef" :model="gitForm" :rules="gitFormRules" label-width="120px">
                        <el-form-item :label="$t('message.containerGitURL')" prop="repo">
                            <el-input 
                                v-model="gitForm.repo" 
                                :placeholder="$t('message.gitUrlPlaceholder') || 'https://github.com/username/repository.git'"
                                size="large">
                                <template #prepend>
                                    <el-icon><Link /></el-icon>
                                </template>
                            </el-input>
                        </el-form-item>
                        
                        <el-form-item :label="$t('message.branchName')" prop="branch">
                            <el-input 
                                v-model="gitForm.branch" 
                                :placeholder="$t('message.branchPlaceholder') || 'main'"
                                size="large">
                                <template #prepend>
                                    <el-icon><Connection /></el-icon>
                                </template>
                            </el-input>
                        </el-form-item>
                        
                        <el-row :gutter="16">
                            <el-col :span="12">
                                <el-form-item :label="$t('message.username')">
                                    <el-input 
                                        v-model="gitForm.username" 
                                        :placeholder="$t('message.optional') || '可选'"
                                        size="large">
                                        <template #prepend>
                                            <el-icon><User /></el-icon>
                                        </template>
                                    </el-input>
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :label="$t('message.password')">
                                    <el-input 
                                        v-model="gitForm.password" 
                                        type="password" 
                                        show-password
                                        :placeholder="$t('message.optional') || '可选'"
                                        size="large">
                                        <template #prepend>
                                            <el-icon><Lock /></el-icon>
                                        </template>
                                    </el-input>
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </el-form>
                </el-card>

                <!-- JAR Upload -->
                <el-card v-if="form.sourceType=='FatJar'" class="config-card" shadow="never">
                    <template #header>
                        <div class="config-header">
                            <el-icon><Document /></el-icon>
                            <span>{{$t('message.jarUpload') || 'JAR 文件上传'}}</span>
                        </div>
                    </template>
                    
                    <el-upload
                        class="jar-upload"
                        drag
                        :file-list="fileList"
                        :on-success="onSuccess"
                        :action="`${requestUrl}/container/jarUpload`"
                        :headers="headersObj"
                        :before-upload="beforeUpload"
                        accept=".jar">
                        <el-icon class="upload-icon"><UploadFilled /></el-icon>
                        <div class="upload-text">
                            {{$t('message.dragJarFile') || '将 JAR 文件拖拽到此处，或'}} 
                            <em>{{$t('message.clickUpload') || '点击上传'}}</em>
                        </div>
                        <template #tip>
                            <div class="upload-tip">
                                {{$t('message.jarUploadTip') || '仅支持 .jar 格式文件，大小不超过 100MB'}}
                            </div>
                        </template>
                    </el-upload>
                </el-card>
            </el-form>
            
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogVisible = false" size="large">
                        {{$t('message.cancel') || '取消'}}
                    </el-button>
                    <el-button 
                        type="primary" 
                        @click="onSubmit" 
                        :loading="submitting"
                        :disabled="form.sourceType=='FatJar' && !sourceInfo"
                        size="large">
                        {{$t('message.save') || '保存'}}
                    </el-button>
                </div>
            </template>
        </el-dialog>
        <!-- Deploy/Worker Logs Dialog -->
        <el-dialog 
            :title="arrangeTitle" 
            v-model="arrangeVisible" 
            width="70%"
            :close-on-click-modal="false"
            v-on:close="closeArrange">
            <div class="logs-container">
                <el-scrollbar height="400px">
                    <div class="log-content">
                        <div v-if="logs.length === 0" class="log-empty">
                            <el-icon><Loading /></el-icon>
                            <span>{{$t('message.loading') || '加载中...'}}</span>
                        </div>
                        <div v-else>
                            <div 
                                v-for="(log, index) in logs" 
                                :key="index" 
                                class="log-line"
                                :class="getLogClass(log)">
                                <span class="log-time">{{getLogTime()}}</span>
                                <span class="log-text">{{log}}</span>
                            </div>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="arrangeVisible = false" size="large">
                        {{$t('message.close') || '关闭'}}
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>

</template>

<script>
import baseUrl from '../../main';
import { ElMessage, ElMessageBox } from "element-plus";
import { 
    Plus, 
    Box, 
    Edit, 
    Delete, 
    VideoPlay, 
    More, 
    Monitor, 
    Clock, 
    Promotion,
    Folder,
    Document,
    Link,
    Connection,
    User,
    Lock,
    UploadFilled,
    Loading
} from '@element-plus/icons-vue';

let ws;
export default {
    name: "ContainerManager",
    components: {
        Plus,
        Box, 
        Edit,
        Delete, 
        VideoPlay,
        More,
        Monitor, 
        Clock, 
        Promotion,
        Folder,
        Document,
        Link,
        Connection,
        User,
        Lock,
        UploadFilled,
        Loading
    },
    data() {
        return {
            form: {
                sourceType: 'Git',
                containerName: '',
            },
            gitForm: {
                repo: '',
                branch: 'main',
                username: '',
                password: '',
            },
            sourceInfo: '',
            id: '',
            appId: window.localStorage.getItem("Power_appId"),
            dialogVisible: false,
            arrangeTitle: '',
            arrangeVisible: false,
            containerList: [],
            logs: [],
            requestUrl: "",
            fileList: [],
            loading: false,
            submitting: false,
            deployingItems: [],
            headersObj: {
                PowerJwt: undefined,
                AppId: undefined
            },
            formRules: {
                containerName: [
                    { required: true, message: '请输入容器名称', trigger: 'blur' },
                    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
                ],
                sourceType: [
                    { required: true, message: '请选择容器类型', trigger: 'change' }
                ]
            },
            gitFormRules: {
                repo: [
                    { required: true, message: '请输入 Git 仓库地址', trigger: 'blur' },
                    { type: 'url', message: '请输入有效的 URL', trigger: 'blur' }
                ],
                branch: [
                    { required: true, message: '请输入分支名称', trigger: 'blur' }
                ]
            }
        }
    },
    computed: {
        enabledContainers() {
            return this.containerList.filter(item => item.status === 'ENABLE').length;
        },
        gitContainers() {
            return this.containerList.filter(item => item.sourceType === 'Git').length;
        },
        jarContainers() {
            return this.containerList.filter(item => item.sourceType === 'FatJar').length;
        }
    },
    methods: {
        async onSubmit() {
            try {
                // Validate forms
                if (this.form.sourceType === 'Git') {
                    await this.$refs.gitFormRef?.validate();
                }
                await this.$refs.formRef?.validate();
                
                this.submitting = true;
                
                const data = {
                    appId: this.appId,
                    containerName: this.form.containerName,
                    status: "ENABLE",
                    id: this.id,
                    sourceType: this.form.sourceType,
                };
                
                if (this.form.sourceType === 'Git') {
                    data.sourceInfo = JSON.stringify(this.gitForm);
                } else {
                    data.sourceInfo = this.sourceInfo;
                    data.sourceType = 'FatJar';
                }
                
                const res = await this.axios.post("container/save", data);
                console.log('container save result:', res);
                
                ElMessage.success(this.$t('message.saveSuccess') || '保存成功');
                this.resetForm();
                this.dialogVisible = false;
                await this.listContainers();
                
            } catch (error) {
                console.error('Save container error:', error);
                ElMessage.error(this.$t('message.saveFailed') || '保存失败');
            } finally {
                this.submitting = false;
            }
        },
        
        resetForm() {
            this.form.containerName = '';
            this.gitForm = {
                repo: '',
                branch: 'main',
                username: '',
                password: '',
            };
            this.sourceInfo = '';
            this.id = '';
            this.fileList = [];
        },
        onSuccess(response) {
            this.sourceInfo = response.data;
            ElMessage.success(this.$t('message.uploadSuccess') || '上传成功');
        },
        
        beforeUpload(file) {
            const isJar = file.name.toLowerCase().endsWith('.jar');
            const isLt100M = file.size / 1024 / 1024 < 100;
            
            if (!isJar) {
                ElMessage.error(this.$t('message.jarFileOnly') || '只能上传 JAR 文件！');
                return false;
            }
            if (!isLt100M) {
                ElMessage.error(this.$t('message.fileSizeLimit') || '上传文件大小不能超过 100MB！');
                return false;
            }
            return true;
        },
        
        async deleteItem(item, index) {
            try {
                await ElMessageBox.confirm(
                    this.$t('message.deleteConfirm', { name: item.containerName }) || `确定删除容器 "${item.containerName}" 吗？`,
                    this.$t('message.warning') || '警告',
                    {
                        confirmButtonText: this.$t('message.confirm') || '确定',
                        cancelButtonText: this.$t('message.cancel') || '取消',
                        type: 'warning',
                    }
                );
                
                const appId = window.localStorage.getItem("Power_appId");
                await this.axios.get(`/container/delete?containerId=${item.id}&appId=${appId}`);
                
                this.containerList.splice(index, 1);
                ElMessage.success(this.$t('message.deleteSuccess') || '删除成功');
                
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('Delete container error:', error);
                    ElMessage.error(this.$t('message.deleteFailed') || '删除失败');
                }
            }
        },
        
        handleCommand({ action, item, index }) {
            if (action === 'delete') {
                this.deleteItem(item, index);
            } else if (action === 'workers') {
                this.listOfItem(item);
            }
        },
        editItem(item) {
            try {
                if (item.sourceType === 'Git') {
                    this.form.sourceType = 'Git';
                    this.gitForm = JSON.parse(item.sourceInfo || '{}');
                } else {
                    this.form.sourceType = 'FatJar';
                    this.sourceInfo = item.sourceInfo;
                }
                this.form.containerName = item.containerName;
                this.id = item.id;
                this.dialogVisible = true;
            } catch (error) {
                console.error('Edit item error:', error);
                ElMessage.error(this.$t('message.editFailed') || '编辑失败');
            }
        },
        
        arrangeItem(item) {
            try {
                // Add to deploying list for loading state
                this.deployingItems.push(item.id);
                
                // Close existing WebSocket connection if exists
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                
                const wsBase = this.requestUrl.replace("http", "ws") + "/container/deploy/";
                const wsUrl = wsBase + item.id;
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    this.arrangeTitle = `${this.$t('message.deploy')} - ${item.containerName}`;
                    this.arrangeVisible = true;
                    this.logs = [];
                    console.log("WebSocket connection opened");
                    ws.send("Hello WebSockets!");
                };

                ws.onmessage = (evt) => {
                    this.logs.push(evt.data);
                    // Auto scroll to bottom
                    this.$nextTick(() => {
                        const scrollbar = this.$el.querySelector('.el-scrollbar__wrap');
                        if (scrollbar) {
                            scrollbar.scrollTop = scrollbar.scrollHeight;
                        }
                    });
                };

                ws.onclose = () => {
                    console.log("WebSocket connection closed");
                    // Remove from deploying list
                    const index = this.deployingItems.indexOf(item.id);
                    if (index > -1) {
                        this.deployingItems.splice(index, 1);
                    }
                };
                
                ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    ElMessage.error(this.$t('message.deployFailed') || '部署连接失败');
                    // Remove from deploying list on error
                    const index = this.deployingItems.indexOf(item.id);
                    if (index > -1) {
                        this.deployingItems.splice(index, 1);
                    }
                };
            } catch (error) {
                console.error('Deploy error:', error);
                ElMessage.error(this.$t('message.deployFailed') || '部署失败');
            }
        },
        closeArrange() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            this.logs = [];
            this.arrangeVisible = false;
        },
        
        closeEdit() {
            this.resetForm();
            this.$refs.formRef?.clearValidate();
            this.$refs.gitFormRef?.clearValidate();
        },
        
        async listOfItem(item) {
            try {
                const appId = window.localStorage.getItem("Power_appId");
                const res = await this.axios.get(`/container/listDeployedWorker?containerId=${item.id}&appId=${appId}`);
                
                if (res.data.data) {
                    this.logs = res.data.data.split('\n').filter(log => log.trim());
                    this.arrangeTitle = `${this.$t('message.deployedWorkerList')} - ${item.containerName}`;
                    this.arrangeVisible = true;
                } else {
                    ElMessage.info(this.$t('message.noWorkerData') || '暂无工作节点数据');
                }
            } catch (error) {
                console.error('List workers error:', error);
                ElMessage.error(this.$t('message.listWorkersFailed') || '获取工作节点列表失败');
            }
        },
        
        formatTime(timestamp) {
            if (!timestamp) return '-';
            return new Date(timestamp).toLocaleString();
        },
        
        getLogTime() {
            return new Date().toLocaleTimeString();
        },
        
        getLogClass(log) {
            if (log.toLowerCase().includes('error')) return 'log-error';
            if (log.toLowerCase().includes('warning')) return 'log-warning';
            if (log.toLowerCase().includes('success')) return 'log-success';
            return 'log-info';
        },
        calculateRequestUrl() {
            if (baseUrl === undefined || !baseUrl.includes("http")) {
                const url = window.location.href;
                const urlSplit = url.split('//');
                const ip = urlSplit[1].split('/')[0];
                this.requestUrl = urlSplit[0] + '//' + ip;
                console.log("calculateRequestUrl:", this.requestUrl);
            } else {
                this.requestUrl = baseUrl;
            }
        },

        async listContainers() {
            try {
                this.loading = true;
                const appId = window.localStorage.getItem("Power_appId");
                const res = await this.axios.get(`/container/list?appId=${appId}`);
                
                console.log('Container list response:', res);
                if (res.data.success) {
                    this.containerList = res.data.data || [];
                } else {
                    ElMessage.error(res.data.message || 'Failed to load containers');
                }
            } catch (error) {
                console.error('List containers error:', error);
                ElMessage.error(this.$t('message.loadFailed') || '加载失败');
                this.containerList = [];
            } finally {
                this.loading = false;
            }
        }
    },
    async mounted() {
        this.calculateRequestUrl();
        await this.listContainers();
        
        this.headersObj.AppId = window.localStorage.getItem("Power_appId");
        this.headersObj.PowerJwt = window.localStorage.getItem("PowerJwt");
    },
    beforeUnmount() {
        // Close WebSocket connection before component unmount
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    }
};
</script>

<style scoped>
/* Main container */
.container-manager {
  padding: 0px;
  background: #f8f9fa;
  min-height: calc(100vh - 60px);
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.header-content h1.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 6px 0;
}

.page-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.header-actions .el-button {
  height: 36px;
  padding: 0 16px;
  font-weight: 500;
  border-radius: 4px;
  font-size: 14px;
}

/* Stats section */
.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  background: white;
}

.stats-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.stat-content {
  text-align: center;
  padding: 20px 16px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* Container grid */
.container-grid {
  margin-bottom: 24px;
}

.loading-state {
  padding: 40px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.empty-state {
  padding: 60px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  text-align: center;
}

/* Container cards */
.container-card {
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  overflow: hidden;
  background: #ffffff;
}

.container-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.container-card.container-disabled {
  opacity: 0.6;
  background: #f9fafb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0;
}

.container-info {
  flex: 1;
  min-width: 0;
}

.container-info h3.container-name {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 4px 0;
  word-break: break-word;
  line-height: 1.4;
}

.container-id {
  font-size: 11px;
  color: #6b7280;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  word-break: break-all;
  line-height: 1.3;
}

.container-status {
  flex-shrink: 0;
  margin-left: 12px;
}

/* Container details */
.container-details {
  padding: 12px 16px 16px 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  min-height: 20px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  flex-shrink: 0;
  margin-right: 12px;
  line-height: 1.4;
}

.detail-label .el-icon {
  margin-right: 6px;
  color: #9ca3af;
  font-size: 14px;
}

.detail-value {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  text-align: right;
  flex: 1;
  min-width: 0;
  word-break: break-word;
  line-height: 1.4;
}

.version-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

/* Container actions */
.container-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e5e7eb;
}

.container-actions .el-button {
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
  height: 28px;
  padding: 0 12px;
}

.container-actions .el-button-group .el-button {
  border-radius: 4px 0 0 4px;
}

.container-actions .el-button-group .el-button:last-child {
  border-radius: 0 4px 4px 0;
}

.container-actions .el-button .el-icon {
  font-size: 12px;
}

/* Dialog styles */
.container-form {
  padding: 24px 0;
}

.container-form .el-form-item {
  margin-bottom: 24px;
}

.container-form .el-input,
.container-form .el-radio-group {
  width: 100%;
}

.container-form .el-input__inner {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  height: 44px;
}

.container-form .el-radio-button__inner {
  border-radius: 8px;
  padding: 12px 20px;
  font-weight: 500;
}

/* Config cards */
.config-card {
  margin-top: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.config-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #1f2937;
}

.config-header .el-icon {
  margin-right: 8px;
}

/* Upload styles */
.jar-upload {
  margin-top: 16px;
}

.jar-upload .el-upload-dragger {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  transition: all 0.3s ease;
}

.jar-upload .el-upload-dragger:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-icon {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.upload-text {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 8px;
}

.upload-tip {
  color: #9ca3af;
  font-size: 12px;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.dialog-footer .el-button {
  min-width: 80px;
  height: 44px;
  border-radius: 8px;
  font-weight: 500;
}

/* Logs container */
.logs-container {
  background: #1f2937;
  border-radius: 8px;
  overflow: hidden;
}

.log-content {
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 16px;
}

.log-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  padding: 40px;
}

.log-empty .el-icon {
  margin-right: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.log-line {
  display: flex;
  margin-bottom: 4px;
}

.log-time {
  color: #6b7280;
  margin-right: 12px;
  min-width: 80px;
}

.log-text {
  color: #f9fafb;
  flex: 1;
}

.log-error .log-text {
  color: #ef4444;
}

.log-warning .log-text {
  color: #f59e0b;
}

.log-success .log-text {
  color: #10b981;
}

.log-info .log-text {
  color: #3b82f6;
}

/* Responsive design */
@media (max-width: 768px) {
  .container-manager {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    text-align: center;
  }
  
  .stats-section .el-col {
    margin-bottom: 16px;
  }
  
  .container-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .container-actions .el-button-group {
    width: 100%;
  }
  
  .config-card {
    margin: 16px -24px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

@media (max-width: 480px) {
  .header-content h1.page-title {
    font-size: 24px;
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .container-form {
    padding: 16px 0;
  }
}

/* Print styles */
@media print {
  .container-manager {
    background: white;
    padding: 0;
  }
  
  .page-header,
  .stats-card,
  .container-card {
    box-shadow: none;
    border: 1px solid #e5e7eb;
  }
  
  .container-actions {
    display: none;
  }
}
</style>
