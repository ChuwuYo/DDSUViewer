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

5. SettingsModal: 添加“保存当前的串口配置”功能（实现说明）
   - 使用本地存储键：
     - 当前配置：ddsuv_serial_config_v1
     - 备份快照：ddsuv_serial_config_saved_v1
   - 行为：
     - 勾选复选框时立即将当前配置复制到备份键（若无内容仍写入空字符串以表明已启用）
     - 取消勾选时删除备份键（由复选框承担“清除备份”的操作，界面已移除独立的“清除”按钮以简化 UX）
     - 勾选后重启应用仍生效：SerialConfigPanel 启动时会优先读取 ddsuv_serial_config_saved_v1（若存在且非空），并将其写回 ddsuv_serial_config_v1 以作为当前配置
     - 提供“恢复”按钮用于立即将备份写回当前配置并通过 CustomEvent('ddsuv_serial_config_restored') 广播，供界面即时应用
   - 技术细节：
     - SettingsModal 使用原生 input[type="checkbox"] 以规避项目中 Chakra Checkbox 的 TS JSX 类型问题
     - SerialConfigPanel 监听恢复事件以支持即时应用
     - 本方案可扩展为服务端持久化（可选：后续添加 Wails 后端接口）

6. 文档完善