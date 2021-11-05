<template>
  <div class="config-list">
    <el-radio-group v-model="type">
    <div class="item">
      <el-radio label="TYPE_EVERY" class="choice" :disabled="disabled">每时</el-radio>
    </div>
    <div class="item">
      <el-radio label="TYPE_RANGE" class="choice" :disabled="disabled">区间</el-radio>
       从<el-input :disabled="type!=TYPE_RANGE || disabled" :max="maxValue" :min="minValue" :precision="0"
        class="w60" v-model="valueRange.start" />时
       至<el-input :disabled="type!=TYPE_RANGE || disabled" :max="maxValue" :min="minValue" :precision="0"
        class="w60" v-model="valueRange.end" />时
    </div>
    <div class="item">
      <el-radio label="TYPE_LOOP" class="choice" :disabled="disabled">循环</el-radio>
      从<el-input :disabled="type!=TYPE_LOOP || disabled" :max="maxValue" :min="minValue" :precision="0"
       class="w60" v-model="valueLoop.start" />时开始，间隔
      <el-input :disabled="type!=TYPE_LOOP || disabled" :max="maxValue" :min="minValue" :precision="0"
       class="w60" v-model="valueLoop.interval" />时
    </div>
    <div class="item">
      <el-radio  label="TYPE_SPECIFY" class="choice" :disabled="disabled">指定</el-radio>
      <div class="list">
        <el-checkbox-group v-model="valueList">
          <el-checkbox class="list-check-item" v-for="i in maxValue+1"
            :label="`${i-1}`" :key="`key-${i-1}`" :disabled="type!=TYPE_SPECIFY || disabled"></el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    </el-radio-group>
  </div>
</template>

<script>
import mixin from './mixin'

export default {
  name: 'minute',
  mixins: [mixin],
  data () {
    return {}
  },
  watch: {
    value_c (newVal) {
      this.$emit('change', newVal)
    }
  },
  created () {
    this.DEFAULT_VALUE = '*'
    this.minValue = 0
    this.maxValue = 23
    this.valueRange.start = 0
    this.valueRange.end = 23
    this.valueLoop.start = 0
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
