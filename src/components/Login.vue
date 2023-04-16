<template>
    <div class="login-page">
        <div class="login-intro">
            <h1>PowerJob</h1>
            <p>Enterprise job scheduling middleware with distributed computing ability.</p>
        </div>
        <div class="login-panel">
            <div class="panel-content">
                <h2>Login</h2>
                <form>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" v-model="username" />
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" v-model="password" />
                    </div>
                    <el-button type="primary" @click="handleRegister">Register</el-button>
                    <el-button type="success" @click="handleLogin">Login</el-button>
                </form>
                <div id="third_part_login">
                    第三方登陆
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "Login",
    data() {
        return {
            username: "",
            password: "",
        };
    },
    methods: {
        handleRegister() {

        },
        handleLogin() {
            // 处理登录逻辑
            console.log("login");
        },
    },
};
</script>

<style scoped>
.login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-image: url("../assets/banner.jpg");
}

.login-intro {
    flex: 1;
    padding: 50px;
    text-align: center;
    color: #ffffff;
}

h1 {
    font-size: 36px;
    margin-bottom: 20px;
}

p {
    font-size: 18px;
}

.login-panel {
    width: 400px;
    background-color: #fff;
    margin-right: 30px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
}

.panel-content {
    padding: 30px;
    text-align: center;
}

h2 {
    margin-top: 0;
}

.form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    text-align: left;
}

label {
    margin-bottom: 5px;
    font-weight: bold;
}

input {
    padding: 8px;
    font-size: 16px;
    border-radius: 3px;
    border: 1px solid #ccc;
}

input:focus {
    outline: none;
    border-color: #007bff;
}
</style>
