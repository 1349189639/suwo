export const CURRENT_VERSION = '0.6.0'

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  items: string[]
}

/** 最新的排在最前面 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.6.0',
    date: '2026-10-29',
    title: '营养更细，记账更顺',
    items: [
      '首页显示膳食纤维和水分，目标按你的体重算',
      '每条记录都能看到蛋白/碳水/脂肪/纤维/水分',
      '每餐可以单独记账，也可以只记单项',
      '可以翻看历史日期的记录并补录',
      '食物库搜不到时，可以让 AI 估一个并存进库',
      '修复：重启后纤维、水分、花费会清零',
      '修复：搜索被当前分类挡住，搜不到「玉米」',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-10-25',
    title: '扫码与相册',
    items: [
      '扫码改用 ZXing，Android WebView 里终于能用了',
      '拍照和相册拆成两个独立按钮',
      '食物库扩充到 235 条',
      '小人身材变化更明显（腹肌、肚腩）',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-24',
    title: '第一版',
    items: ['账号注册登录', 'BMI / 目标 / 热量预算', '饮食与运动记录', '虚拟形象'],
  },
]

export const LATEST = CHANGELOG[0]
