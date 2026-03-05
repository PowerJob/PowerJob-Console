module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 类型枚举
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响代码运行的变动）
        'refactor', // 重构（既不是新增功能，也不是修改 bug 的代码变动）
        'perf',     // 性能优化
        'test',     // 增加测试
        'chore',    // 构建过程或辅助工具的变动
        'revert',   // 回滚
        'build'     // 构建系统或外部依赖的更改
      ]
    ],
    // 主题不能为空
    'subject-empty': [2, 'never'],
    // 主题以句号结尾
    'subject-full-stop': [2, 'never', '.'],
    // 主题类型
    'type-case': [2, 'always', 'lower-case'],
    // 主题不能为空
    'type-empty': [2, 'never'],
    // 主题大小写
    'subject-case': [0],
    // 正文以空行开头
    'body-leading-blank': [2, 'always'],
    // 正文多行
    'body-max-line-length': [2, 'always', 200],
    // 页脚以空行开头
    'footer-leading-blank': [2, 'always'],
    // 页脚多行
    'footer-max-line-length': [2, 'always', 200],
    // 主题最大长度
    'header-max-length': [2, 'always', 100]
  }
}
