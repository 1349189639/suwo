import { useState } from 'react'
import { Button, Field, TextField } from '../components/ui'
import { useStore } from '../data/store'
import { VISION_PRESETS, loadVisionConfig, saveVisionConfig, type VisionConfig } from '../data/vision'

export function VisionSettings() {
  const setToast = useStore((s) => s.setToast)
  const [cfg, setCfg] = useState<VisionConfig>(loadVisionConfig())

  const set = (patch: Partial<VisionConfig>) => setCfg({ ...cfg, ...patch })

  return (
    <div className="anim-rise space-y-4 pb-2">
      <div className="rounded-2xl border border-line bg-surface2/40 p-3.5">
        <div className="text-[12.5px] text-ink">拍照后自动记录，靠的是视觉大模型</div>
        <p className="mt-1 text-[10.5px] leading-4 text-muted/60">
          默认已经填好 DeepSeek 的 <span className="text-ink">deepseek-flash</span>（支持图片），
          <span className="text-ink">你只需要把 API Key 粘进来</span>。Key 只存这台手机，不会上传到别处。
        </p>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-muted">快速选择服务商</div>
        <div className="flex flex-wrap gap-1.5">
          {VISION_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => set({ baseUrl: p.baseUrl, model: p.model })}
              className={`rounded-full border px-3 py-1.5 text-[12px] ${
                cfg.baseUrl === p.baseUrl ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line text-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="接口地址" hint="以 /chat/completions 结尾的父路径">
        <TextField value={cfg.baseUrl} onChange={(v) => set({ baseUrl: v })} placeholder="https://..." />
      </Field>

      <Field label="模型名">
        <TextField value={cfg.model} onChange={(v) => set({ model: v })} placeholder="doubao-vision-pro-32k" />
      </Field>

      <Field label="API Key" hint="只存本机">
        <TextField value={cfg.apiKey} onChange={(v) => set({ apiKey: v })} placeholder="sk-..." />
      </Field>

      <Button
        className="w-full"
        onClick={() => {
          saveVisionConfig(cfg)
          setToast(cfg.apiKey ? '已保存，拍照时可以自动识别了' : '已保存（还没填 Key）')
        }}
      >
        保存
      </Button>

      <p className="text-[10px] leading-4 text-muted/40">
        如果保存后识别报「连不上」，大概率是服务商不允许浏览器直连（CORS）。这种情况需要一个小中转服务，把请求转发一下——告诉我就行，我给你写。
      </p>
    </div>
  )
}
