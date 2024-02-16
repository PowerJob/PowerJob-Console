<template>
  <div id="namespace_manager">

    <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
    <el-row :gutter="20">

      <!-- 左侧搜索栏，占地面积 16/24 -->
      <el-col :span="16">
        <el-form :inline="true" :model="queryNamespaceRequest" class="el-form--inline">
          <el-form-item label="code">
            <el-input v-model="queryNamespaceRequest.codeLike" placeholder="code"/>
          </el-form-item>
          <el-form-item :label="$t('message.name')">
            <el-input v-model="queryNamespaceRequest.nameLike" :placeholder="$t('message.name')"/>
          </el-form-item>
          <el-form-item label="tag">
            <el-input v-model="queryNamespaceRequest.tagLike" placeholder="tag"/>
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
      <el-table :data="namespaceResult.data" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"/>
        <el-table-column prop="code" label="code"/>
        <el-table-column prop="name" :label="$t('message.name')" />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" />
        <el-table-column prop="statusStr" :label="$t('message.status')" />
        <el-table-column prop="creator" :label="$t('message.creator')" />
        <el-table-column prop="modifier" :label="$t('message.modifier')" />

        <el-table-column :label="$t('message.operation')" width="150">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="onClickModify(scope.row)">{{$t('message.edit')}}</el-button>
            <el-button size="mini" type="text" @click="onClickDeleteNamespace(scope.row)">{{$t('message.delete')}}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-row>

    <!-- 第三行，分页插件 -->
    <el-row>
      <el-pagination
          layout="prev, pager, next"
          :total="this.namespaceResult.totalItems"
          :page-size="this.namespaceResult.pageSize"
          @current-change="onClickChangePage"
          :hide-on-single-page="true"/>
    </el-row>


    <el-dialog :close-on-click-modal="false" :visible.sync="modifiedNamespaceFormVisible" width="80%">
      <el-form :model="modifiedNamespaceForm" label-width="120px">
        <el-form-item label="code">
          <el-input v-model="modifiedNamespaceForm.code"/>
        </el-form-item>
        <el-form-item :label="$t('message.name')">
          <el-input v-model="modifiedNamespaceForm.name"/>
        </el-form-item>
        <el-form-item label="Token" >
          <el-input :disabled="true" v-model="modifiedNamespaceForm.token"/>
        </el-form-item>
        <el-form-item :label="$t('message.tag')">
          <el-input v-model="modifiedNamespaceForm.tags"/>
        </el-form-item>
        <el-form-item :label="$t('message.extra')">
          <el-input v-model="modifiedNamespaceForm.extra"/>
        </el-form-item>

        <el-form-item :label="$t('message.permissionManage')">
          <user-role :user-rule-form="user_rule_form"/>
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
import UserRole from "../common/UserRole.vue";

export default {
  name: "NamespaceManager",
  components: {UserRole},
  data() {
    return {

      // 查询命名空间
      queryNamespaceRequest: {
        codeLike: undefined,
        nameLike: undefined,
        tagLike: undefined,
        index:0,
        pageSize:10
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

      user_rule_form: {
        observer: [],
        qa: [],
        developer: [],
        admin: [],
      },

      namespaceResult: [],

      // 显示变量
      modifiedNamespaceFormVisible: false
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryNamespaceRequest.codeLike = undefined;
      this.queryNamespaceRequest.nameLike = undefined;
      this.queryNamespaceRequest.tagLike = undefined;
      this.queryNamespaceRequest.index = 0;
      this.listNamespaces();
    },

    // 查询 namespace
    listNamespaces() {
      const that = this;
      this.axios.post("/namespace/list", this.queryNamespaceRequest).then((res) => {
        that.namespaceResult = res;
      });
    },

    // 点击 换页
    onClickChangePage(index) {
      // 后端从0开始，前端从1开始
      this.queryNamespaceRequest.index = index - 1;
      this.listNamespaces();
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
      this.user_rule_form.observer = []
      this.user_rule_form.qa = []
      this.user_rule_form.developer = []
      this.user_rule_form.admin = []

      this.modifiedNamespaceFormVisible = true;
    },

    // 保存
    onClickSaveNamespace() {
      let that = this;
      this.modifiedNamespaceForm['componentUserRoleInfo'] = this.user_rule_form;

      console.log("modifiedNamespaceForm: " + JSON.stringify(this.modifiedNamespaceForm))
      this.axios.post("/namespace/save", this.modifiedNamespaceForm, {
        'headers': {
          'Content-Type': 'application/json',
          'NamespaceId': that.modifiedNamespaceForm.id
        }
      }).then(() => {
        that.$message.success(that.$t('message.success'));
        this.listNamespaces();
      }, e => that.$message.error(e))
      this.modifiedNamespaceFormVisible = false;
    },

    // 点击 编辑按钮
    onClickModify(data) {
      this.modifiedNamespaceForm = JSON.parse(JSON.stringify(data));
      this.user_rule_form = JSON.parse(JSON.stringify(data.componentUserRoleInfo));
      this.modifiedNamespaceFormVisible = true;
    },

    // 点击 删除命名空间
    onClickDeleteNamespace(data) {
      const url = '/namespace/delete?id=' + data.id
      console.log('delete url:' + url)
      this.axios.delete(url, {
        'headers': {
          'Content-Type': 'application/json',
          'NamespaceId': data.id
        }
      }).then(ret => {
        console.log('delete ret: ' + ret)
        this.listNamespaces();
      })
    }
  },
  mounted() {
    this.listNamespaces()
  }
}
</script>


<style scoped>

</style>