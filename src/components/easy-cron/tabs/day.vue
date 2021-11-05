<template>
  <div class="config-list">
    <el-radio-group v-model="type">
    <div class="item">
      <el-radio label="TYPE_NOT_SET" class="choice" :disabled="disableChoice">不设置</el-radio>
      <span class="tip-info">日和周只能设置其中之一</span>
    </div>
    <div class="item">
      <el-radio label="TYPE_EVERY" class="choice" :disabled="disableChoice">每日</el-radio>
    </div>
    <div class="item">
      <el-radio label="TYPE_RANGE" class="choice" :disabled="disableChoice">区间</el-radio>
       从<el-input :disabled="type!=TYPE_RANGE || disableChoice" :max="maxValue" :min="minValue" :precision="0"
        class="w60" v-model="valueRange.start" />日
       至<el-input :disabled="type!=TYPE_RANGE || disableChoice" :max="maxValue" :min="minValue" :precision="0"
        class="w60" v-model="valueRange.end" />日
    </div>
    <div class="item">
      <el-radio label="TYPE_LOOP" class="choice" :disabled="disableChoice">循环</el-radio>
      从<el-input :disabled="type!=TYPE_LOOP || disableChoice" :max="maxValue" :min="minValue" :precision="0"
       class="w60" v-model="valueLoop.start" />日开始，间隔
      <el-input :disabled="type!=TYPE_LOOP || disableChoice" :max="maxValue" :min="minValue" :precision="0"
       class="w60" v-model="valueLoop.interval" />日
    </div>
    <div class="item">
      <el-radio label="TYPE_WORK" class="choice" :disabled="disableChoice">工作日</el-radio>
      本月<el-input :disabled="type!=TYPE_WORK || disableChoice" :max="maxValue" :min="minValue" :precision="0"
       class="w60" v-model="valueWork" />日，最近的工作日
    </div>
    <div class="item">
      <el-radio label="TYPE_LAST" class="choice" :disabled="disableChoice">最后一日</el-radio>
    </div>
    <div class="item">
      <el-radio label="TYPE_SPECIFY" class="choice" :disabled="disableChoice">指定</el-radio>
      <div class="list">
        <el-checkbox-group v-model="valueList">
          <el-checkbox class="list-check-item" v-for="i in maxValue"
            :label="`${i}`" :key="`key-${i}`" :disabled="type!=TYPE_SPECIFY || disableChoice"></el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    </el-radio-group>
  </div>
</template>

<script>
import mixin from './mixin'

export default {
  name: 'day',
  mixins: [mixin],
  props: {
    week: {
      type: String,
      default: '?'
    }
  },
  data () {
    return {}
  },
  computed: {
    disableChoice () {
      return (this.week && this.week !== '?') || this.disabled
    }
  },
  watch: {
    value_c () {
      // 数值变化
      this.updateValue()
    },
    week () {
      // console.info('new week: ' + newVal)
      this.updateValue()
    }
  },
  methods: {
    updateValue () {
      this.$emit('change', this.disableChoice ? '?' : this.value_c)
    }
  },
  created () {
    this.DEFAULT_VALUE = '*'
    this.minValue = 1
    this.maxValue = 31
    this.valueRange.start = 1
    this.valueRange.end = 31
    this.valueLoop.start = 1
    this.valueLoop.interval = 1
    this.parseProp(this.prop)
  }
}
</script>

<style scoped>

.config-list {
  text-align: left;
  margin: 0 10px 10px 10px;
}

.item {
  margin-top: 5px;
}

.tip-info {
  color: #999
}

.choice {
  border: 1px solid transparent;
  padding: 5px 8px;
}

.choice:hover {
  border: 1px solid #2d8cf0;
}

.w60 {
  width: 60px;
}

.ivu-input-number {
  margin-left: 5px;
  margin-right: 5px;
}

.list {
  margin: 0 20px;
}

.list-check-item {
  padding: 1px 3px;
  width: 4em;
}
.el-radio-group {
  font-size: 10px;
}
</style>
