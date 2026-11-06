/**
 * 隐私政策文案（可配置入口）。
 * 2026-11-05 经运营者确认定稿：运营主体徐荣泽（个人）、联系方式仅邮箱、数据存储地中国上海。
 * 改这一个文件即可，界面不用动。
 */
import type { Consent } from '../domain/types'

export interface PolicySection {
  h: string
  p: string
}

/** 是否已同意「当前这一版」政策；改政策正文时把 updatedAt 一起改，老用户会被要求重新同意 */
export function hasValidConsent(consent: Consent | undefined): boolean {
  return Boolean(consent && consent.policyVersion === PRIVACY_POLICY.updatedAt)
}

export const PRIVACY_POLICY: {
  title: string
  updatedAt: string
  intro: string
  sections: PolicySection[]
  contact: string
} = {
  title: '隐私政策',
  updatedAt: '2026-11-05',
  intro:
    '「塑我」是由个人开发者运营的热量与训练记录工具。我们只收集让这个 App 正常工作所必需的数据，不用于广告，也不出售给第三方。',
  sections: [
    {
      h: '一、我们收集什么',
      p: '① 账号信息：手机号（用于注册、登录与找回密码，不读取通讯录）；② 你主动填写的身体数据与记录：性别、出生年份、身高、体重、饮食与运动记录；③ 为排查问题所需的最基本设备与运行信息。',
    },
    {
      h: '二、数据存在哪里',
      p: '数据保存在腾讯云开发（CloudBase），环境位于中国上海（ap-shanghai），数据存储地为中国境内；数据按账号隔离，仅本人登录后可见。本机也会缓存一份，便于离线查看。',
    },
    {
      h: '三、我们用这些做什么、保存多久',
      p: '仅用于账号登录与找回、计算热量与营养目标、生成你的报表与建议。不会用于广告投放，不会出售或向无关第三方共享。数据保存至你删除账号为止；删除账号后云端记录一并清除。',
    },
    {
      h: '四、第三方服务',
      p: '账号认证、数据库与网页托管由腾讯云开发（CloudBase）提供；注册与登录时的短信验证码由云开发默认短信通道下发，因此会向该服务提供你的手机号。若你使用扫码添加食物，条形码会提交至公开的 Open Food Facts 数据库查询；若你在拍照识别中自行填写了 AI 服务商的 API Key，识图请求会由你自己的 Key 直接发往该服务商。',
    },
    {
      h: '五、你的权利',
      p: '你可以随时在「我的」页导出 Excel 表格或 JSON 备份带走数据，也可在「我的 → 删除账号」永久删除云端账号与记录，删除后不可恢复。如需查询、更正或删除个人信息，请通过下方联系方式联系运营者。',
    },
    {
      h: '六、未成年人',
      p: '本应用面向成年人。未满 18 周岁请在监护人同意下使用。',
    },
    {
      h: '七、政策更新',
      p: '本政策如有变更，会在应用内提示；继续使用视为接受更新后的版本。',
    },
  ],
  contact:
    '运营者：徐荣泽（个人开发者） · 联系邮箱：1349189639@qq.com · 数据存储地：腾讯云开发 CloudBase，中国上海（ap-shanghai）',
}
