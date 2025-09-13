1. 记住用户上次输入/选择的 配置

2. 在页面右上角添加设置按钮
   - 创建自定义设置图标组件 (SettingsIcon.tsx)
   - 在标题栏右侧添加IconButton组件
   - 使用Chakra UI的ghost变体保持界面一致性
   - 图标使用提供的SVG图形

3. 修复IconButton组件属性错误
   - 将icon属性改为children属性以符合Chakra UI v3规范

4. 修复SVG图标显示问题
   - 使用createIcon函数替代Icon组件包装SVG路径
   - 解决"path标签无法识别"的浏览器兼容性问题