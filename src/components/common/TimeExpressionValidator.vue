<template>
    <div>
        <el-card class="box-card">
            <div v-for="res in nextNTriggerTime" :key="res" class="text item">
                {{ res }}
            </div>
        </el-card>
    </div>
</template>

<script>
    export default {
        name: "TimeExpressionValidator",
        // 数据传递
        props: ["timeExpressionType", "timeExpression"],
        data() {
            return {
                nextNTriggerTime: [],
                encodedTimeExpression: ''
            }
        },
        methods: {
            checkTimeExpression() {
                let that = this;
                let url = "/validate/timeExpression?timeExpressionType=" + this.timeExpressionType + "&timeExpression=" + this.encodedTimeExpression;
                this.axios.get(url).then(res => that.nextNTriggerTime = res);
            }
        },mounted() {
            console.log("type:" + this.timeExpressionType);
            console.log("expression:" + this.timeExpression);
            this.encodedTimeExpression = encodeURIComponent(this.timeExpression);
            console.log("expressionAfterEncodeURIComponent: " + this.encodedTimeExpression);
            this.checkTimeExpression();
        }
    }
</script>

<style scoped>

</style>
