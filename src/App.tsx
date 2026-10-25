import { useEffect, useState } from 'react'
import { Sheet } from './components/ui'
import { readDemoParams } from './data/demo'
import { currentAccountId } from './data/auth'
import { useStore } from './data/store'
import { Auth } from './screens/Auth'
import { ActionPicker } from './screens/ActionPicker'
import { ExerciseSheet } from './screens/ExerciseSheet'
import { FoodDiary } from './screens/FoodDiary'
import { Home } from './screens/Home'
import { LookEditor } from './screens/LookEditor'
import { Onboarding } from './screens/Onboarding'
import { ProfileScreen } from './screens/Profile'
import { Stats } from './screens/Stats'
import { VisionSettings } from './screens/VisionSettings'
import { WeightSheet } from './screens/WeightSheet'

type Tab = 'home' | 'stats' | 'me'
type SheetKind = 'food' | 'exercise' | 'weight' | 'action' | 'look' | 'vision' | null

/** ?demo=1&tab=stats&sheet=food 仅用于演示与视觉验收 */
const PARAMS = readDemoParams()
const INITIAL_TAB: Tab = PARAMS.tab === 'stats' ? 'stats' : PARAMS.tab === 'me' ? 'me' : 'home'
const INITIAL_SHEET: SheetKind =
  PARAMS.sheet === 'food' ||
  PARAMS.sheet === 'exercise' ||
  PARAMS.sheet === 'weight' ||
  PARAMS.sheet === 'action' ||
  PARAMS.sheet === 'look' ||
  PARAMS.sheet === 'vision'
    ? PARAMS.sheet
    : null

export default function App() {
  const data = useStore((s) => s.data)
  const toast = useStore((s) => s.toast)
  const setToast = useStore((s) => s.setToast)

  const switchAccount = useStore((s) => s.switchAccount)
  const [authed, setAuthed] = useState(() => Boolean(currentAccountId()))
  const [tab, setTab] = useState<Tab>(INITIAL_TAB)
  const [sheet, setSheet] = useState<SheetKind>(INITIAL_SHEET)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1900)
    return () => clearTimeout(t)
  }, [toast, setToast])

  if (!authed) {
    return (
      <Auth
        onDone={(id) => {
          switchAccount(id)
          setAuthed(true)
        }}
      />
    )
  }

  if (!data.profile || !data.goal) return <Onboarding />

  const close = () => setSheet(null)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] pb-24">
      {tab === 'home' && (
        <Home
          onFood={() => setSheet('food')}
          onExercise={() => setSheet('exercise')}
          onWeight={() => setSheet('weight')}
          onStats={() => setTab('stats')}
          onAction={() => setSheet('action')}
        />
      )}
      {tab === 'stats' && <Stats />}
      {tab === 'me' && (
        <ProfileScreen
          onOpenLook={() => setSheet('look')}
          onOpenVision={() => setSheet('vision')}
          onLoggedOut={() => {
            switchAccount(null)
            setAuthed(false)
          }}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-line/80 bg-canvas/90 backdrop-blur-xl">
        <div
          className="grid grid-cols-3 px-3 pt-2"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          <NavItem icon="home" label="今日" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavItem icon="chart" label="报表" active={tab === 'stats'} onClick={() => setTab('stats')} />
          <NavItem icon="me" label="我的" active={tab === 'me'} onClick={() => setTab('me')} />
        </div>
      </nav>

      <Sheet
        open={sheet === 'food'}
        title="饮食日记"
        subtitle="早 / 午 / 晚 / 加餐分开记，各自统计"
        onClose={close}
        full
      >
        <FoodDiary open={sheet === 'food'} onClose={close} onOpenVision={() => setSheet('vision')} />
      </Sheet>
      <Sheet open={sheet === 'exercise'} title="记运动" onClose={close}>
        <ExerciseSheet open={sheet === 'exercise'} onClose={close} />
      </Sheet>
      <Sheet open={sheet === 'weight'} title="记录体重" onClose={close}>
        <WeightSheet open={sheet === 'weight'} onClose={close} />
      </Sheet>
      <Sheet
        open={sheet === 'action'}
        title="让小人动起来"
        subtitle="选一个动作演示，不会自动记训练"
        onClose={close}
      >
        <ActionPicker onClose={close} />
      </Sheet>

      <Sheet
        open={sheet === 'look'}
        title="我的形象"
        subtitle="改完立刻生效，首页的小人就是它"
        onClose={close}
      >
        <LookEditor />
      </Sheet>

      <Sheet
        open={sheet === 'vision'}
        title="AI 识图"
        subtitle="拍一张饭，自动出菜名和热量"
        onClose={close}
      >
        <VisionSettings />
      </Sheet>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center">
          <div className="anim-rise rounded-full bg-ink/90 px-4 py-2 text-[13px] font-medium text-canvas shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: 'home' | 'chart' | 'me'
  label: string
  active: boolean
  onClick: () => void
}) {
  const stroke = active ? '#3ddc97' : '#7d8ea1'
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1.5">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon === 'home' && (
          <>
            <path d="M3.5 10.5 12 3.5l8.5 7" />
            <path d="M6 9.8V20h12V9.8" />
          </>
        )}
        {icon === 'chart' && (
          <>
            <path d="M4 20V12" />
            <path d="M10 20V5" />
            <path d="M16 20v-6" />
            <path d="M21 20H3" />
          </>
        )}
        {icon === 'me' && (
          <>
            <circle cx="12" cy="8" r="3.6" />
            <path d="M4.8 20c.8-4 3.7-6 7.2-6s6.4 2 7.2 6" />
          </>
        )}
      </svg>
      <span className="text-[10px]" style={{ color: active ? '#3ddc97' : '#7d8ea1' }}>
        {label}
      </span>
    </button>
  )
}
