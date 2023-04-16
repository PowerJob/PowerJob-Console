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
                    <button @click="handleLogin">Login</button>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.login-intro {
    flex: 1;
    padding: 50px;
    text-align: center;
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

button {
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 3px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
}

button:hover {
    background-color: #0069d9;
}
</style>

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
        handleLogin() {
            // 处理登录逻辑
            console.log("login");
        },
    },
};
</script>
