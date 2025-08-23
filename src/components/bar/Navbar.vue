<template>
    <div id="navbar">
        <div id="logo_content">
            <a href="http://www.powerjob.tech/" target="_blank">
                <img src="../../assets/powerjob-console-logo.png"  alt="logo"/>
            </a>
        </div>

        <div id="right_content">

            <el-dropdown @command="this.common.switchLanguage">
                <span class="el-dropdown-link">
                    <p style="color:#ffffff">Language<i class="el-icon-arrow-down el-icon--right"/></p>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                    <el-dropdown-item command="en">English</el-dropdown-item>
                    <el-dropdown-item command="cn">简体中文</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>

            <el-dropdown @command="handleSettings">
                <span class="el-dropdown-link">
                    <p style="color:#ffffff">Settings<i class="el-icon-arrow-down el-icon--right"/></p>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                    <el-dropdown-item command="back2Home">{{$t('message.back2Home')}}</el-dropdown-item>
                    <el-dropdown-item command="logout">{{$t('message.logout')}}</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Navbar",
        data() {
            return {
            }
        },
        methods: {

          // 返回主页
          onClickBack2Home() {
            window.localStorage.removeItem('Power_appId')
            this.$router.push("/");
          },

          // 退出登录
          onClickLogout() {
            window.localStorage.removeItem('Power_appId');
            window.localStorage.removeItem('PowerJwt')
            this.$router.push("/");
          },
            // 处理系统设置的指令时间
            handleSettings: function (cmd) {
                switch (cmd) {
                    case "logout": this.onClickLogout(); break;
                    case "back2Home": this.onClickBack2Home(); break;
                }
            }
        }
    }
</script>

<style scoped>
    #navbar {
        width: 100%;
        height: var(--pj-navbar-height);
        display: flex;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        justify-content: space-between;
        align-items: center;
        box-shadow: var(--pj-shadow-navbar);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        z-index: 1000;
    }

    #logo_content {
        width: var(--pj-sidebar-width);
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 var(--pj-space-md);
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.2);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        
        a {
            display: flex;
            align-items: center;
            height: 100%;
            transition: transform 0.3s ease;
            
            &:hover {
                transform: scale(1.05);
            }
        }
    }

    #right_content {
        display: flex;
        align-items: center;
        gap: var(--pj-space-lg);
        padding: 0 var(--pj-space-xl);
        
        @media (max-width: 768px) {
            gap: var(--pj-space-md);
            padding: 0 var(--pj-space-md);
        }
    }

    img {
        max-width: 180px;
        height: auto;
        max-height: 50px;
        object-fit: contain;
    }

    .el-dropdown {
        cursor: pointer;
        
        .el-dropdown-link {
            display: flex;
            align-items: center;
            
            p {
                margin: 0;
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: var(--pj-space-xs);
                padding: var(--pj-space-sm) var(--pj-space-md);
                border-radius: var(--pj-radius-sm);
                transition: all 0.3s ease;
                
                &:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }
                
                i {
                    font-size: 12px;
                    transition: transform 0.3s ease;
                }
            }
            
            &:hover p i {
                transform: rotate(180deg);
            }
        }
        
        @media (max-width: 768px) {
            .el-dropdown-link p {
                font-size: 13px;
                padding: var(--pj-space-xs) var(--pj-space-sm);
            }
        }
    }

    /* Dark theme for dropdowns */
    :deep(.el-dropdown-menu) {
        background: #2d2d2d;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        
        .el-dropdown-menu__item {
            color: rgba(255, 255, 255, 0.8);
            
            &:hover {
                background: rgba(0, 150, 136, 0.1);
                color: var(--pj-primary-light);
            }
        }
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
        #logo_content {
            width: 180px;
        }
    }

    @media (max-width: 768px) {
        #navbar {
            height: 60px;
        }
        
        #logo_content {
            width: 160px;
        }
        
        img {
            max-width: 140px;
            max-height: 40px;
        }
    }
</style>
