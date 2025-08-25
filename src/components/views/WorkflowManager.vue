<template>
<div class="workflow-manager">

    <!-- Search and Action Section -->
    <div class="pj-form-section">
        <div class="search-container">
            <div class="search-form">
                <el-form :inline="true" :model="workflowQueryContent" class="el-form--inline">
                    <el-form-item :label="$t('message.wfId')">
                        <el-input 
                            v-model="workflowQueryContent.workflowId" 
                            :placeholder="$t('message.wfId')"
                            clearable
                            style="width: 200px;"
                        />
                    </el-form-item>
                    <el-form-item :label="$t('message.keyword')">
                        <el-input 
                            v-model="workflowQueryContent.keyword" 
                            :placeholder="$t('message.keyword')"
                            clearable
                            style="width: 200px;"
                        />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="listWorkflow">
                            <el-icon class="mr-1"><Search /></el-icon>
                            {{$t('message.query')}}
                        </el-button>
                        <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
                    </el-form-item>
                </el-form>
            </div>
            
            <div class="action-buttons" v-if="!isWorkflow">
                <el-button type="primary" @click="onClickNewWorkflow">
                    <el-icon class="mr-1"><Plus /></el-icon>
                    {{$t('message.newWorkflow')}}
                </el-button>
            </div>
        </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table">
        <el-table 
            :data="workflowPageResult.data" 
            style="width: 100%" 
            :type="isWorkflow ? 'selection' : null"
            stripe
        >
            <el-table-column prop="id" :label="$t('message.wfId')" width="80" sortable/>
            <el-table-column prop="wfName" :label="$t('message.wfName')" min-width="200" show-overflow-tooltip />
            <el-table-column :label="$t('message.scheduleInfo')" min-width="150" show-overflow-tooltip>
                <template #default="scope">
                    <div class="schedule-info-enhanced">
                        <div class="schedule-type">
                            <el-tag size="small">
                                {{translateTimeExpressionType(scope.row.timeExpressionType)}}
                            </el-tag>
                        </div>
                        <div class="schedule-expression" :title="scope.row.timeExpression">
                            {{scope.row.timeExpression}}
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column :label="$t('message.status')" width="80" align="center" v-if="!isWorkflow">
                <template #default="scope">
                    <el-switch 
                        v-model="scope.row.enable" 
                        :active-color="'var(--pj-success)'" 
                        :inactive-color="'var(--pj-error)'"
                        @change="switchWorkflow(scope.row)"
                    />
                </template>
            </el-table-column>
            <el-table-column :label="$t('message.operation')" :width="isWorkflow ? 100 : 300" align="center" fixed="right">
                <template #default="scope">
                    <div v-if="!isWorkflow" class="operation-buttons-enhanced">
                        <el-button 
                            size="small" 
                            type="primary" 
                            @click="onClickModifyWorkflow(scope.row)"
                        >
                            <el-icon><Edit /></el-icon>
                            {{$t('message.edit')}}
                        </el-button>
                        <el-button 
                            size="small" 
                            type="success" 
                            @click="onClickRunWorkflow(scope.row)"
                        >
                            <el-icon><VideoPlay /></el-icon>
                            {{$t('message.run')}}
                        </el-button>
                        <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, scope.row)">
                            <el-button size="small" type="info">
                                {{$t('message.more')}}
                                <el-icon class="ml-1"><ArrowDown /></el-icon>
                            </el-button>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item command="runByParameter">
                                        <el-icon><Setting /></el-icon>
                                        {{$t('message.runByParameter')}}
                                    </el-dropdown-item>
                                    <el-dropdown-item command="copy">
                                        <el-icon><CopyDocument /></el-icon>
                                        {{$t('message.copy')}}
                                    </el-dropdown-item>
                                    <el-dropdown-item command="delete" divided>
                                        <el-icon><Delete /></el-icon>
                                        <span style="color: var(--pj-error);">{{$t('message.delete')}}</span>
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>
                    <div v-if="isWorkflow" class="operation-buttons-enhanced">
                        <el-button size="small" type="primary" @click="onImportNode(scope.row)">
                            <el-icon><Upload /></el-icon>
                            引入
                        </el-button>
                    </div>
                </template>
            </el-table-column>
        </el-table>
    </div>

    <!-- Pagination Section -->
    <div class="pagination-container">
        <el-pagination
            layout="total, sizes, prev, pager, next, jumper"
            :total="this.workflowPageResult.totalItems"
            :page-size="this.workflowPageResult.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="onClickChangePage"
            @size-change="handleSizeChange"
            :hide-on-single-page="false"
            background
        />
    </div>
    <el-dialog
            :title="$t('message.runByParameter')"
            v-model="runByParameterVisible"
            width="50%"
        >
            <el-input
                type="textarea"
                :rows="4"
                :placeholder="$t('message.enteringParameter')"
                v-model="runParameter">
            </el-input>
            <template #footer class="dialog-footer">
                <el-button @click="onClickRunCancel">{{$t('message.cancel')}}</el-button>
                <el-button type="primary" @click="onClickRunWorkflow(temporaryRowData)" :loading="runLoading">{{$t('message.run')}}</el-button>
            </template>
        </el-dialog>
</div>
</template>

<script>
    import { ElMessage } from 'element-plus';
    import { Search, Plus, ArrowDown, Edit, VideoPlay, Setting, CopyDocument, Delete, Upload } from '@element-plus/icons-vue';
    export default {
        name: "WorkflowManager",
        components: {
            Search,
            Plus,
            ArrowDown,
            Edit,
            VideoPlay,
            Setting,
            CopyDocument,
            Delete,
            Upload
        },
        props: ['isWorkflow'],
        data() {
            return {
                // 查询条件
                workflowQueryContent: {
                    appId: window.localStorage.getItem("Power_appId"),
                    index: 0,
                    pageSize: 10,
                    workflowId: undefined,
                    keyword: undefined
                },
                // 工作流查询结果
                workflowPageResult: {
                    pageSize: 10,
                    totalItems: 0,
                    data: []
                },
                // 复制loading
                copyLoading: false,
                // 新建工作流对象
                workflowObj: {

                },
                temporaryRowData: null,
                // 运行参数
                runParameter: null,
                // 运行loading
                runLoading: false,
                // 参数运行对话框可见性
                runByParameterVisible: false
            }
        },
        methods: {
            // 查询工作流
            listWorkflow() {
                const that = this;
                this.axios.post("/workflow/list", this.workflowQueryContent).then((res) => {
                    that.workflowPageResult = res;
                });
            },
            /** 引入嵌套工作流节点 */
            onImportNode(data) {
                this.$emit('onImportNode', data)
            },
            // 点击重置
            onClickReset() {
                this.workflowQueryContent.workflowId = undefined;
                this.workflowQueryContent.keyword = undefined;
            },
            // 开关工作流
            switchWorkflow(data) {
                let that = this;
                let path = data.enable ? "enable" : "disable";
                let url = "/workflow/" + path + "?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                this.axios.get(url, res => {
                    console.log(res);
                    that.listWorkflow();
                });
            },
            // 编辑工作流
            onClickModifyWorkflow(data) {
                this.$router.push({
                    name: 'workflowEditor',
                    query: {
                        modify: true,
                        workflowId: data.id
                    }
                })
            },
            // 立即运行工作流
            onClickRunWorkflow(data) {
                let url = "/workflow/run?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                if (this.temporaryRowData && this.runParameter) {
                    url += `&initParams=${encodeURIComponent(this.runParameter)}`
                }
                this.runLoading = true;
                this.axios.get(url).then(() => {
                    ElMessage.success(this.$t('message.success'))
                    this.temporaryRowData = null;
                    this.runParameter = null;
                    this.runByParameterVisible = false;
                    this.runLoading = false
                }).catch(() => {
                    this.runLoading = false
                });
            },
            // 翻译时间表达式类型
            translateTimeExpressionType(timeExpressionType) {
                switch (timeExpressionType) {
                    case "API": return "API";
                    case "CRON": return "CRON";
                    case "FIXED_RATE": return this.$t('message.fixRate');
                    case "FIXED_DELAY": return this.$t('message.fixDelay');
                    case "WORKFLOW": return this.$t('message.workflow');
                    case "DAILY_TIME_INTERVAL": return this.$t('message.dailyTimeInterval');
                    default: return timeExpressionType;
                }
            },
            // 处理分页大小变化
            handleSizeChange(newSize) {
                this.workflowQueryContent.pageSize = newSize;
                this.workflowQueryContent.index = 0;
                this.listWorkflow();
            },
            // 处理下拉菜单命令
            handleCommand(command, row) {
                switch (command) {
                    case 'runByParameter':
                        this.onClickRunByParameter(row);
                        break;
                    case 'copy':
                        this.onClickCopy(row);
                        break;
                    case 'delete':
                        this.$confirm(this.$t('message.deleteConfirm'), this.$t('message.warning'), {
                            confirmButtonText: this.$t('message.confirm'),
                            cancelButtonText: this.$t('message.cancel'),
                            type: 'warning'
                        }).then(() => {
                            this.onClickDeleteWorkflow(row);
                        });
                        break;
                }
            },
            // 参数运行
            onClickRunByParameter(data) {
                this.temporaryRowData = data;
                this.runParameter = '';
                this.runByParameterVisible = true;
            },
            // 取消参数运行
            onClickRunCancel() {
                this.temporaryRowData = null;
                this.runParameter = null;
                this.runByParameterVisible = false;
            },
            // 删除工作流
            onClickDeleteWorkflow(data) {
                let that = this;
                let url = "/workflow/delete?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                this.axios.get(url).then(() => {
                    ElMessage.success(this.$t('message.success'));
                    that.listWorkflow();
                });
            },
            // 新建工作流
            onClickNewWorkflow() {
                this.$router.push({
                    name: 'workflowEditor',
                    query: {
                        modify: false
                    }
                })
            },
            // 点击换页
            onClickChangePage(index) {
                // 后端从0开始，前端从1开始
                this.workflowQueryContent.index = index - 1;
                this.listWorkflow();
            },
            /** 复制工作流 */
            onClickCopy(data) {
                this.copyLoading = true
                this.axios.post(`/workflow/copy?workflowId=${data.id}&appId=${this.workflowQueryContent.appId}`).then(res => {
                    this.$router.push({
                        name: 'workflowEditor',
                        query: {
                            modify: true,
                            workflowId: res
                        }
                    });
                    this.copyLoading = false;
                    ElMessage.success(this.$t('message.success'));
                }).catch(() => {
                    this.copyLoading = false;
                })
            }
        },
        mounted() {
            this.listWorkflow();
        }
    }
</script>

<style scoped lang="scss">
/* Modern Workflow Manager Styles */
.workflow-manager {
    padding: 0;
    background: transparent;
}

/* Search Section */
.search-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--pj-space-lg);
}

.search-form {
    flex: 1;
    min-width: 400px;
}

.action-buttons {
    display: flex;
    gap: var(--pj-space-sm);
    flex-shrink: 0;
}

/* Enhanced Schedule Info Styling */
.schedule-info-enhanced {
    display: flex;
    flex-direction: column;
    gap: var(--pj-space-xs);
    min-width: 0;
}

.schedule-info-enhanced .schedule-type {
    flex-shrink: 0;
}

.schedule-info-enhanced .schedule-expression {
    font-size: 12px;
    color: var(--pj-text-secondary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: help;
}

/* Enhanced Operation Buttons */
.operation-buttons-enhanced {
    display: flex;
    align-items: center;
    gap: var(--pj-space-sm);
    justify-content: center;
    flex-wrap: wrap;
}

.operation-buttons-enhanced .el-button {
    border-radius: var(--pj-radius-sm);
    font-weight: 500;
    transition: all 0.3s ease;
    margin: 0;
}

.operation-buttons-enhanced .el-button .el-icon {
    margin-right: 4px;
}

.operation-buttons-enhanced .el-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Dropdown menu enhancements */
.operation-buttons-enhanced :deep(.el-dropdown-menu) {
    .el-dropdown-menu__item {
        display: flex;
        align-items: center;
        gap: var(--pj-space-sm);
        
        .el-icon {
            width: 16px;
            height: 16px;
        }
    }
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    padding: var(--pj-space-lg) 0;
    background: var(--pj-bg-white);
    border-radius: var(--pj-radius-lg);
    margin-top: var(--pj-space-md);
    box-shadow: var(--pj-shadow-card);
}

/* Utility Classes */
.mr-1 {
    margin-right: var(--pj-space-xs);
}

.ml-1 {
    margin-left: var(--pj-space-xs);
}

/* Enhanced Form Styles */
:deep(.el-form--inline .el-form-item) {
    margin-right: var(--pj-space-lg);
    margin-bottom: var(--pj-space-md);
}

:deep(.el-form-item__label) {
    color: var(--pj-text-secondary);
    font-weight: 500;
}

:deep(.el-input__wrapper) {
    border-radius: var(--pj-radius-sm);
    transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
}

/* Table Enhancements */
:deep(.el-table) {
    .el-table__header-wrapper th {
        background: #fafbfc;
        color: var(--pj-text-secondary);
        font-weight: 600;
        border-bottom: 2px solid #e4e7ed;
    }
    
    .el-table__body-wrapper tr:hover {
        background: var(--pj-bg-hover);
    }
}

/* Tag Enhancements */
:deep(.el-tag) {
    border-radius: var(--pj-radius-sm);
    font-weight: 500;
}

/* Switch Styling */
:deep(.el-switch) {
    --el-switch-on-color: var(--pj-success);
    --el-switch-off-color: var(--pj-error);
}

/* Dialog Enhancements */
:deep(.el-dialog) {
    border-radius: var(--pj-radius-lg);
    box-shadow: var(--pj-shadow-hover);
    
    .el-dialog__header {
        padding: var(--pj-space-lg);
        background: #fafbfc;
        border-bottom: 1px solid #e4e7ed;
        border-radius: var(--pj-radius-lg) var(--pj-radius-lg) 0 0;
        
        .el-dialog__title {
            font-weight: 600;
            color: var(--pj-text-primary);
        }
    }
    
    .el-dialog__body {
        padding: var(--pj-space-lg);
        max-height: 70vh;
        overflow-y: auto;
    }
    
    .el-dialog__footer {
        padding: var(--pj-space-lg);
        background: #fafbfc;
        border-top: 1px solid #e4e7ed;
        border-radius: 0 0 var(--pj-radius-lg) var(--pj-radius-lg);
    }
}

/* Responsive Design */
@media (max-width: 1200px) {
    .operation-buttons-enhanced {
        gap: var(--pj-space-xs);
    }
    
    .operation-buttons-enhanced .el-button {
        font-size: 12px;
        padding: 6px 12px;
    }
}

@media (max-width: 1024px) {
    .search-container {
        flex-direction: column;
        align-items: stretch;
    }
    
    .search-form {
        min-width: auto;
    }
    
    .action-buttons {
        justify-content: flex-end;
    }
    
    .schedule-info-enhanced .schedule-expression {
        max-width: 180px;
    }
}

@media (max-width: 768px) {
    .action-buttons {
        flex-direction: column;
        width: 100%;
    }
    
    .pagination-container {
        :deep(.el-pagination) {
            flex-wrap: wrap;
            justify-content: center;
        }
    }
}
</style>
