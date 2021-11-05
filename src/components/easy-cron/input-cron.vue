<template>
  <div class="input-cron">
    <el-input :placeholder="placeholder" style="width: auto" v-model="editCronValue" :disabled="disabled">
      <a slot="append" @click="showConfigDlg" class="config-btn" :disabled="disabled">
        <el-button type="text" @click="dialogVisible = true">配置cron</el-button>
      </a>
    </el-input>
    <el-dialog title="Cron生成工具" :visible.sync="dialogVisible"  width="800px" :before-close="handleClose">
      <span>
        <easy-cron v-model="editCronValue" width="800px" :exeStartTime="exeStartTime"
                   :hideYear="hideYear" :remote="remote" :hideSecond="hideSecond">
        </easy-cron>
      </span>
      <span slot="footer" class="dialog-footer"/>
    </el-dialog>
<!--    <el-dialog v-model="show" title="配置Cron表达式" :closable="true" :width="`${width+50}`"-->
<!--           :footer-hide="true">-->

<!--        <easy-cron v-model="editCronValue" :style="`width: ${width}px`" :exeStartTime="exeStartTime"-->
<!--                   :hideYear="hideYear" :remote="remote" :hideSecond="hideSecond"></easy-cron>-->
<!--    </el-dialog>-->
  </div>
</template>

<script>
import EasyCron from './index'

export default {
  name: 'input-cron',
  model: {
    prop: 'cronValue',
    event: 'change'
  },
  props: {
    cronValue: {
      type: String,
      default: ''
    },
    width: {
      type: Number,
      default: 700
    },
    placeholder: {
      type: String,
      default: '请输入cron表达式'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    exeStartTime: {
      type: [Number, String, Object],
      default: 0
    },
    hideSecond: {
      type: Boolean,
      default: false
    },
    hideYear: {
      type: Boolean,
      default: false
    },
    remote: {
      type: Function,
      default: null
    }
  },
  data () {
    return {
      editCronValue: this.cronValue,
      show: true,
      dialogVisible: false
    }
  },
  watch: {
    cronValue (newVal) {
      if (newVal === this.editCronValue) {
        return
      }
      this.editCronValue = newVal
    },
    editCronValue (newVal) {
      this.$emit('change', newVal)
    }
  },
  methods: {
    showConfigDlg () {
      if (!this.disabled) {
        this.show = true
      }
    }
  },
  // handleClose(done) {
  //   this.$confirm('确认关闭？')
  //       .then(_ => {
  //         done();
  //       })
  //       .catch(_ => {});
  // },
  components: {
    EasyCron
  }
}
</script>

<style scoped>
.input-cron, .input-ui {
  display: inline-block;
}

.input-cron .ivu-input-wrapper {
  width: 100% !important;
}

.config-btn {
  cursor: pointer;
}

.config-btn:hover {
  color: #2D8CF0;
}
</style>
