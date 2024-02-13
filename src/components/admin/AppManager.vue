<template>
  <div id="app_manager">
    <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
    <el-row :gutter="20">

      <!-- 左侧搜索栏，占地面积 16/24 -->
      <el-col :span="16">
        <el-form :inline="true" :model="queryAppRequest" class="el-form--inline">
          <el-form-item label="ID">
            <el-input v-model="queryAppRequest.appId" placeholder="ID"/>
          </el-form-item>
          <el-form-item label="appName">
            <el-input v-model="queryAppRequest.appNameLike" placeholder="appName(Like)"/>
          </el-form-item>
          <el-form-item label="tag">
            <el-input v-model="queryAppRequest.tagLike" placeholder="tags(Like)"/>
          </el-form-item>

          <el-form-item label="namespace">
            <el-select v-model="queryAppRequest.namespaceId" placeholder="namespace">
              <el-option
                  v-for="item in namespaceList"
                  :key="item.id"
                  :label="item.frontName"
                  :value="item.id">
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="listApps">{{$t('message.query')}}</el-button>
            <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
      </el-col>

      <!-- 右侧新增任务按钮，占地面积 4/24 -->
      <el-col :span="4">
        <div style="float:right;padding-right:10px">
          <el-button type="primary" @click="onClickNewApps">{{$t('message.add')}}</el-button>
        </div>
      </el-col>
    </el-row>

    <!--第二行，任务数据表格-->
    <el-row>
      <el-table :data="appResult.data" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"/>
        <el-table-column prop="appName" label="code" width="150"/>
        <el-table-column prop="title" :label="$t('message.name')" />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" />
        <el-table-column prop="creator" :label="$t('message.creator')" />
        <el-table-column prop="modifier" :label="$t('message.modifier')" />

        <el-table-column :label="$t('message.operation')" width="150">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="onClickModify(scope.row)">{{$t('message.edit')}}</el-button>
            <el-button size="mini" type="text" @click="onClickEnter(scope.row)">{{$t('message.enter')}}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-row>

    <!-- 第三行，分页插件 -->
    <el-row>
      <el-pagination
          layout="prev, pager, next"
          :total="this.appResult.totalItems"
          :page-size="this.appResult.pageSize"
          @current-change="onClickChangePage"
          :hide-on-single-page="true"/>
    </el-row>

    <el-dialog :close-on-click-modal="false" :visible.sync="modifiedAppFormVisible" width="80%">
      <el-form :model="modifiedAppForm" label-width="120px">

        <el-form-item label="namespace">
          <el-select v-model="modifiedAppForm.namespaceId" placeholder="namespace">
            <el-option
                v-for="item in namespaceList"
                :key="item.id"
                :label="item.frontName"
                :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="appName">
          <el-input v-model="modifiedAppForm.appName"/>
        </el-form-item>
        <el-form-item :label="$t('message.name')">
          <el-input v-model="modifiedAppForm.title"/>
        </el-form-item>
        <el-form-item :label="$t('message.password')">
          <el-input v-model="modifiedAppForm.password"/>
        </el-form-item>
        <el-form-item :label="$t('message.tag')">
          <el-input v-model="modifiedAppForm.tags"/>
        </el-form-item>
        <el-form-item :label="$t('message.extra')">
          <el-input v-model="modifiedAppForm.extra"/>
        </el-form-item>

        <el-form-item label="权限管控">
          <user-role :user-rule-form="user_rule_form"/>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onClickSaveApp">{{$t('message.save')}}</el-button>
          <el-button @click="modifiedAppFormVisible = false">{{$t('message.cancel')}}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
// import UserRole from "../common/UserRole.vue";

import UserRole from "../common/UserRole.vue";

export default {
  name: "AppManager",
  components: {UserRole},
  // components: {UserRole},
  data() {
    return {
      // 查询 APP 请求
      queryAppRequest: {
        appId: undefined,
        namespaceId: undefined,
        appNameLike: undefined,
        tagLike: undefined,
        showMyRelated: false,
        index:0,
        pageSize:10
      },

      // 创建or修改表单
      modifiedAppForm: {
        id: undefined,
        appName: undefined,
        namespaceId: undefined,
        password: undefined,
        title: undefined,
        tags: undefined,
        extra: undefined
      },

      user_rule_form: {
        observer: [],
        qa: [],
        developer: [],
        admin: [],
      },

      appResult: [],

      // 显示变量
      modifiedAppFormVisible: false,

      // namespace，用于驱动下拉列表
      namespaceList: []
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryAppRequest.appId = undefined;
      this.queryAppRequest.namespaceId = undefined;
      this.queryAppRequest.appNameLike = undefined;
      this.queryAppRequest.tagLike = undefined;
      this.queryAppRequest.showMyRelated = false;
      this.queryAppRequest.index = 0;
      this.listApps();
    },

    // 查询 namespace
    listApps() {
      const that = this;
      this.axios.post("/appInfo/list", this.queryAppRequest).then((res) => {
        that.appResult = res;
      });
    },

    // 点击 换页
    onClickChangePage(index) {
      // 后端从0开始，前端从1开始
      this.queryAppRequest.index = index - 1;
      this.listApps();
    },

    // 点击新增按钮
    onClickNewApps() {
      // 清空之前填写的脏数据
      this.modifiedAppForm = {
        id: undefined,
        appName: undefined,
        password: undefined,
        title: undefined,
        tags: undefined,
        extra: undefined
      }

      this.user_rule_form.observer = []
      this.user_rule_form.qa = []
      this.user_rule_form.developer = []
      this.user_rule_form.admin = []

      this.modifiedAppFormVisible = true;
    },

    onClickSaveApp() {
      let that = this;
      this.modifiedAppForm['componentUserRoleInfo'] = this.user_rule_form;

      console.log("modifiedAppForm: " + JSON.stringify(this.modifiedAppForm))
      this.axios.post("/appInfo/save", this.modifiedAppForm, {
        'headers': {
          'Content-Type': 'application/json',
          'AppId': that.modifiedAppForm.id
        }
      }).then(() => {
        that.$message.success(that.$t('message.success'));
      }, e => that.$message.error(e))
      this.modifiedAppFormVisible = false;
      this.listApps();
    },

    // 点击 编辑按钮
    onClickModify(data) {
      this.modifiedAppForm = JSON.parse(JSON.stringify(data));
      this.user_rule_form = JSON.parse(JSON.stringify(data.componentUserRoleInfo));
      this.modifiedAppFormVisible = true;
    },

    // 进入任务管理界面
    onClickEnter(data) {
      let appInfo = {
        id: data.id,
        appName: data.appName
      };
      // 将 appId 存储到 VueStore
      this.$store.commit("initAppInfo", appInfo);

      // 同步存储一份到 localStorage（后续主要使用 localStorage，鉴权全部在服务端，本地无脑存即可）
      window.localStorage.setItem('Power_appId', appInfo.id)

      // 跳转到主界面
      this.$router.push("/oms/home")
    },

    listNamespaces() {
      const that = this;
      this.axios.post("/namespace/listAll", this.queryAppRequest).then((res) => {
        that.namespaceList = res;
      });
    }
  },

  mounted() {
    this.listApps()
    this.listNamespaces()
  }
}
</script>

<style scoped>

</style>