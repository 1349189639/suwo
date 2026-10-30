import { useState } from 'react'
import { Button } from './ui'
import { downloadAndInstall, type RemoteUpdate } from '../data/updater'

export function UpdateDialog({ update, onClose }: { update: RemoteUpdate; onClose: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle')
  const [percent, setPercent] = useState(0)
  const [msg, setMsg] = useState('')

  const start = async () => {
    setPhase('downloading')
    setPercent(0)
    setMsg('')
    try {
      await downloadAndInstall(update, setPercent)
      setPhase('done')
    } catch (e) {
      setPhase('error')
      setMsg(e instanceof Error ? e.message : '更新失败，请稍后再试')
    }
  }

  return (
    <div className="anim-fade fixed inset-0 z-[60] grid place-items-center bg-black/60 px-5">
      <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        <div className="bg-accent/10 px-5 pb-4 pt-5">
          <div className="text-[11px] text-accent">发现新版本</div>
          <div className="mt-1 text-[19px] font-bold">v{update.version}</div>
          {update.sizeMb ? (
            <div className="mt-0.5 text-[11px] text-muted/60">安装包约 {update.sizeMb} MB</div>
          ) : null}
        </div>

        <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto px-5 py-4">
          {(update.notes ?? ['性能与稳定性改进']).map((t) => (
            <li key={t} className="flex gap-2 text-[12.5px] leading-5 text-muted">
              <span className="text-accent">·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {phase === 'downloading' && (
          <div className="px-5 pb-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: percent + '%' }}
              />
            </div>
            <div className="mt-1.5 text-center text-[11px] text-muted/60">
              {percent < 100 ? '正在下载… ' + percent + '%' : '下载完成，正在唤起安装…'}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-5 pb-3 text-center text-[12px] text-accent">
            已调起系统安装，按提示「更新」即可，数据不会丢
          </div>
        )}

        {phase === 'error' && (
          <div className="px-5 pb-3 text-center text-[11.5px] leading-5 text-[#ff6b81]">{msg}</div>
        )}

        <div className="flex gap-2 px-5 pb-5">
          <Button variant="soft" className="flex-1" onClick={onClose} disabled={phase === 'downloading'}>
            {phase === 'done' ? '关闭' : '稍后再说'}
          </Button>
          <Button className="flex-1" onClick={() => void start()} disabled={phase === 'downloading'}>
            {phase === 'downloading' ? '下载中…' : phase === 'done' ? '重新安装' : '立即更新'}
          </Button>
        </div>
      </div>
    </div>
  )
}
