<template>
    <div>
        <el-input
            type="textarea"
            placeholder="请输入内容"
            v-model="jsonContent"
            :autosize="{ minRows: 8, maxRows: 256}"
            :disabled="mode==='EXPORT'"
        >
        </el-input>

        <el-button type="info" @click="onClickCancelButton">{{$t('message.cancel')}}</el-button>
        <el-button type="primary" @click="onClickConfirmButton">{{$t('message.confirm')}}</el-button>
    </div>
</template>

<script>
export default {
    name: "Exporter",
    // 数据传递
    props: [
        "type", // 类型，JOB 代表任务的导入导出，WORKFLOW 代表工作流的导入导出
        "mode", // EXPORT or INPUT
        "targetId" // export 模式有效，目标ID
    ],
    data() {
        return {
            jsonContent: undefined,
        }
    }
    ,
    methods: {

        notifyParent() {
            this.$emit("finished", 'ok');
        },

        fetchExportInfo(type, targetId) {
            let api = '/job/export?jobId=' + targetId;
            if (type === 'WORKFLOW') {
                api = '/workflow/export?workflowId=' + targetId;
            }
            let that = this;
            that.axios.get(api).then(res => {
                console.log('[Exporter] query export result: ' + JSON.stringify(res))
                that.jsonContent = JSON.stringify(res);
            });
        },
        input() {
            console.log('[Exporter] try to input by content: ' + this.jsonContent)
            if (this.jsonContent === undefined || this.jsonContent.length === 0) {
                return;
            }
            this.axios.post("/job/save", JSON.parse(this.jsonContent)).then()
        },

        onClickCancelButton() {
            this.notifyParent();
        },

        onClickConfirmButton() {
            if (this.mode === 'INPUT') {
                this.input();
            }
            this.notifyParent();
        }
    }
    ,mounted() {
        console.log("[Exporter] mounted Exporter with params, type=%s, mode=%s, targetId=%s", this.type, this.mode, this.targetId);
        if (this.mode === 'EXPORT') {
            this.fetchExportInfo(this.type, this.targetId);
        }
    }
}
</script>

<style scoped>

</style>