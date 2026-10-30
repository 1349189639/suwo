import { useBackToClose } from '../components/useBackToClose'
import { useState } from 'react'
import { Button, Card } from '../components/ui'
import { useStore } from '../data/store'
import {
  FEEDBACK_KINDS,
  feedbackSnapshot,
  loadFeedback,
  saveFeedback,
  type FeedbackItem,
  type FeedbackKind,
} from '../data/feedback'
import { CURRENT_VERSION } from '../data/changelog'
import { explainError, submitFeedback } from '../data/cloud.v2'

export function Feedback({ onClose }: { onClose: () => void }) {
  useBackToClose(onClose)
  const data = useStore((s) => s.data)
  const cloudUser = useStore((s) => s.cloudUser)
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [text, setText] = useState('')
  const [list, setList] = useState<FeedbackItem[]>(() => loadFeedback())
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const body = text.trim()
    if (body.length < 3) {
      setMsg('多写几个字吧，至少 3 个字')
      return
    }
    if (!cloudUser) {
      setMsg('请先登录账号后再提交反馈')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const snap = feedbackSnapshot(data)
      await submitFeedback({ kind, text: body, version: CURRENT_VERSION, ...snap })
      const item: FeedbackItem = {
        id: `fb${Date.now()}`,
        at: Date.now(),
        kind,
        text: body,
        version: CURRENT_VERSION,
      }
      const next = [...list, item]
      setList(next)
      saveFeedback(next)
      setText('')
      setMsg('已发送，我在后台能看到。')
    } catch (e) {
      setMsg(`提交失败：${explainError(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-canvas px-4 pb-6"
      style={{ paddingTop: 'max(44px, env(safe-area-inset-top))' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[17px] font-semibold">留言板</div>
          <div className="mt-0.5 text-[11px] text-muted/60">
            用着哪里别扭、哪里出错，直接写给我，提交后我在后台能看到
          </div>
        </div>
        <button onClick={onClose} className="rounded-full bg-accent/20 px-4 py-2 text-[13px] text-accent">
          关闭
        </button>
      </div>

      <Card>
        <div className="flex gap-2">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={
                'flex-1 rounded-xl border px-2 py-2 text-[12px] ' +
                (kind === k.id ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line/60 text-muted')
              }
            >
              {k.label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="比如：记一餐之后回到首页，数字没变，要退出重进才刷新"
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-line bg-surface2/50 px-3 py-2.5 text-[13px] leading-6 outline-none"
        />

        <Button className="mt-3 w-full" disabled={busy} onClick={() => void submit()}>
          {busy ? '发送中…' : '提交反馈'}
        </Button>
        {msg && <div className="mt-2 text-[11px] leading-5 text-accent/80">{msg}</div>}
      </Card>

      {list.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="px-1 text-[11px] text-muted/60">我提过的（{list.length}）</div>
          {[...list]
            .reverse()
            .slice(0, 10)
            .map((f) => (
              <div key={f.id} className="rounded-2xl border border-line/50 bg-surface/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-accent/80">
                    {FEEDBACK_KINDS.find((k) => k.id === f.kind)?.label}
                  </span>
                  <span className="text-[10px] text-muted/40">
                    {new Date(f.at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-muted">{f.text}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
