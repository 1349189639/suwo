import { useEffect, useRef, useState } from 'react'
import { askCoach, type ChatMsg } from '../data/coach'
import { hasVisionConfig } from '../data/vision'
import { useStore } from '../data/store'

const QUICK = ['这周早餐花了多少钱？', '今天还差多少蛋白？', '我想继续减脂，饮食怎么调？']

export function Coach({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const configured = hasVisionConfig()

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setError('')
    setInput('')
    const next: ChatMsg[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setBusy(true)
    try {
      const reply = await askCoach(next, data)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : '出错了，稍后再试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold">问教练</div>
          <div className="text-[10px] text-muted/60">会看你的饮食、体重和花费</div>
        </div>
        <button onClick={onClose} className="text-[12px] text-muted">
          关闭
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[12px] leading-5 text-muted/70">
              你可以问我关于你自己的事，比如：
            </p>
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="block w-full rounded-2xl border border-line/60 bg-surface/70 px-3.5 py-2.5 text-left text-[12.5px] active:opacity-60"
              >
                {q}
              </button>
            ))}
            {!configured && (
              <p className="pt-2 text-[11px] leading-5 text-[#f5b942]">
                还没配置 AI 服务：去「我的 → AI 识图」填一次 API Key，这里就能用了。
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ' +
                (m.role === 'user'
                  ? 'bg-accent/20 text-ink'
                  : 'border border-line/60 bg-surface/80 text-ink/90')
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line/60 bg-surface/80 px-3.5 py-2.5 text-[12px] text-muted">
              思考中…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-[#ff6b81]/40 bg-[#ff6b81]/10 px-3.5 py-2.5 text-[11px] leading-5 text-[#ff6b81]">
            {error}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-line/60 px-3 py-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              className="shrink-0 rounded-full border border-line/60 bg-surface/70 px-3 py-1 text-[11px] text-muted active:opacity-60"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div
        className="flex items-end gap-2 border-t border-line/60 px-3 py-2.5"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send(input)
          }}
          placeholder="问点什么…"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-surface2/60 px-3.5 py-2.5 text-[14px] outline-none"
        />
        <button
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-2xl bg-accent/20 px-4 py-2.5 text-[13px] text-accent disabled:opacity-40"
        >
          发送
        </button>
      </div>
    </div>
  )
}
