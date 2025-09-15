// frontend/src/theme/colors.ts: 主题颜色定义。
// 说明：集中管理应用使用的颜色变量（供 Chakra UI 或自定义样式引用），便于统一风格与课堂演示主题设计。
// 目的：通过集中化主题提高可维护性，修改颜色时请同步检查组件样式影响。
// Material Design 3 色彩体系
export const mdColors = {
  primary: 'rgb(65 95 145)',
  primaryContainer: 'rgb(214 227 255)',
  onPrimaryContainer: 'rgb(40 71 119)',
  secondary: 'rgb(86 95 113)',
  secondaryContainer: 'rgb(218 226 249)',
  onSecondaryContainer: 'rgb(62 71 89)',
  background: 'rgb(249 249 255)',
  surface: 'rgb(249 249 255)',
  surfaceContainer: 'rgb(237 237 244)',
  onSurface: 'rgb(25 28 32)',
  onSurfaceVariant: 'rgb(68 71 78)',
  outline: 'rgb(116 119 127)',
  outlineVariant: 'rgb(196 198 208)',
  error: 'rgb(186 26 26)',
  errorContainer: 'rgb(255 218 214)',
  // 自定义卡片色彩
  cardBackground: '#fffffe',
};

// 数据显示色彩（保持原有彩色）
export const dataColors = {
  blue: '#3182ce',
  orange: '#dd6b20', 
  green: '#38a169',
  purple: '#805ad5',
  teal: '#319795',
  cyan: '#0bc5ea',
  pink: '#d53f8c',
  red: '#e53e3e',
};