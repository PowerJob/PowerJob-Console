<template>
  <div>
    <el-form ref="form" :model="dailyTimeIntervalExpress">
      <el-form-item :label="$t('message.interval')">
          <el-col :span="6">
              <el-input v-model="dailyTimeIntervalExpress.interval"></el-input>
          </el-col>
      </el-form-item>

      <el-form-item :label="$t('message.timeRange')">
        <el-col :span="6">
          <el-time-picker
              v-model="dailyTimeIntervalExpress.startTimeOfDay"
              :placeholder="$t('message.startTime')"
              value-format="HH:mm:ss"
              :picker-options="{
                  format:'HH:mm:ss'
              }"
          >
          </el-time-picker>
        </el-col>
        <el-col class="line" :span="2">-</el-col>
        <el-col :span="6">
          <el-time-picker
              v-model="dailyTimeIntervalExpress.endTimeOfDay"
              :placeholder="$t('message.endTime')"
              value-format="HH:mm:ss"
              :picker-options="{
                  format:'HH:mm:ss'
              }"
          >
          </el-time-picker>
        </el-col>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onSubmit">{{$t('message.save')}}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: "DailyTimeIntervalForm",
  // 数据传递
  props: ["timeExpression"],
  data() {
    return {
      dailyTimeIntervalExpress: {
        interval: undefined,
        startTimeOfDay: undefined,
        endTimeOfDay: undefined,
        intervalUnit: 'SECONDS',
        daysOfWeek: []
      },
    }
  },
  methods: {
    onSubmit() {
      //使用 $emit派发事件
      this.$emit("contentChanged", JSON.stringify(this.dailyTimeIntervalExpress));
    }
  }
  ,mounted() {
      console.log("dailyTimeIntervalExpress:" + this.timeExpression);
      if (this.timeExpression !== undefined && this.timeExpression !== null) {
          this.dailyTimeIntervalExpress = JSON.parse(this.timeExpression);
      }

  }
}
</script>

<style scoped>

</style>