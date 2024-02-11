<template>
  <div id="namespace_manager">

    <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
    <el-row :gutter="20">

      <!-- 左侧搜索栏，占地面积 16/24 -->
      <el-col :span="16">
        <el-form :inline="true" :model="queryNamespaceRequest" class="el-form--inline">
          <el-form-item label="code">
            <el-input v-model="queryNamespaceRequest.code" placeholder="code"/>
          </el-form-item>
          <el-form-item :label="$t('message.name')">
            <el-input v-model="queryNamespaceRequest.name" :placeholder="$t('message.name')"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="listNamespaces">{{$t('message.query')}}</el-button>
            <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
      </el-col>

      <!-- 右侧新增任务按钮，占地面积 4/24 -->
      <el-col :span="4">
        <div style="float:right;padding-right:10px">
          <el-button type="primary" @click="onClickNewNamespace">{{$t('message.add')}}</el-button>
        </div>
      </el-col>
    </el-row>

    <!--第二行，任务数据表格-->
    <el-row>
      <el-table :data="namespaceResult" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"/>
        <el-table-column prop="code" label="code" width="80"/>
        <el-table-column prop="name" :label="$t('message.name')" />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" />
        <el-table-column prop="statusStr" :label="$t('message.status')" />
        <el-table-column prop="creator" :label="$t('message.creator')" />
        <el-table-column prop="modifier" :label="$t('message.modifier')" />
      </el-table>
    </el-row>


    <el-dialog :close-on-click-modal="false" :visible.sync="modifiedNamespaceFormVisible" width="80%">
      <el-form :model="modifiedNamespaceForm" label-width="120px">
        <el-form-item label="code">
          <el-input v-model="modifiedNamespaceForm.code"/>
        </el-form-item>
        <el-form-item :label="$t('message.name')">
          <el-input v-model="modifiedNamespaceForm.name"/>
        </el-form-item>
        <el-form-item :label="$t('message.tag')">
          <el-input v-model="modifiedNamespaceForm.tags"/>
        </el-form-item>
        <el-form-item :label="$t('message.extra')">
          <el-input v-model="modifiedNamespaceForm.extra"/>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onClickSaveNamespace">{{$t('message.save')}}</el-button>
          <el-button @click="modifiedNamespaceFormVisible = false">{{$t('message.cancel')}}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: "NamespaceManager",
  data() {
    return {

      // 查询命名空间
      queryNamespaceRequest: {
        code: undefined,
        name: undefined
      },

      // 创建or修改表单
      modifiedNamespaceForm: {
        id: undefined,
        code: undefined,
        name: undefined,
        tags: undefined,
        status: undefined,
        extra: undefined
      },

      namespaceResult: [],

      // 显示变量
      modifiedNamespaceFormVisible: false
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryNamespaceRequest.code = undefined;
      this.queryNamespaceRequest.name = undefined;
      this.listNamespaces();
    },

    // 查询 namespace
    listNamespaces() {
      const that = this;
      this.axios.post("/namespace/list", this.queryNamespaceRequest).then((res) => {
        that.namespaceResult = res;
      });
    },

    // 新增 namespace
    onClickNewNamespace() {
      // 清空之前填写的脏数据
      this.modifiedNamespaceForm = {
        id: undefined,
        code: undefined,
        name: undefined,
        tags: undefined,
        status: undefined,
        extra: undefined
      }

      this.modifiedNamespaceFormVisible = true;
    },

    onClickSaveNamespace() {
      let that = this;
      this.axios.post("/namespace/save", this.modifiedNamespaceForm).then(() => {
        that.$message.success(that.$t('message.success'));
      }, e => that.$message.error(e))
      this.modifiedNamespaceFormVisible = false;
      this.listJobInfos();
    }
  },
  mounted() {
    this.listNamespaces()
  }
}
</script>


<style scoped>

</style>