import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library'
import { useEffect, useRef, useState } from 'react'
import { lookupBarcode, toFoodItem, type BarcodeProduct } from '../data/barcode'
import { Button, TextField } from './ui'
import type { FoodItem } from '../domain/types'

/**
 * 用 ZXing 解码。
 * 不能用 BarcodeDetector：Android WebView 里没有这个 API（只有 Chrome 浏览器有），
 * 之前的实现在 APK 里等于一直没工作。
 */
function makeHints(): Map<DecodeHintType, unknown> {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
}

type Status = 'idle' | 'scanning' | 'loading' | 'error'

export function BarcodeScanner({ onPick }: { onPick: (food: FoodItem) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const busyRef = useRef(false)
  const cameraInput = useRef<HTMLInputElement | null>(null)
  const galleryInput = useRef<HTMLInputElement | null>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [manual, setManual] = useState('')
  const [found, setFound] = useState<BarcodeProduct | null>(null)
  const [live, setLive] = useState(false)

  const secure = typeof window !== 'undefined' && window.isSecureContext

  const handleCode = async (code: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setStatus('loading')
    setMessage(`已读到条码 ${code}，正在查…`)
    readerRef.current?.reset()
    setLive(false)
    const product = await lookupBarcode(code)
    busyRef.current = false
    if (product) {
      setFound(product)
      setStatus('idle')
    } else {
      setStatus('error')
      setMessage(`条码读到了（${code}），但公开库里没有这个商品。国产商品覆盖差，可以手动按营养表录。`)
    }
  }

  useEffect(() => {
    return () => {
      readerRef.current?.reset()
    }
  }, [])

  const startLive = async () => {
    if (!secure) {
      setStatus('error')
      setMessage('http 局域网地址下浏览器禁用摄像头，请用「拍一张条码」或手动输入。')
      return
    }
    if (!videoRef.current) return
    setStatus('scanning')
    setMessage('')
    const reader = new BrowserMultiFormatReader(makeHints(), 120)
    readerRef.current = reader
    setLive(true)
    try {
      await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result) => {
          if (result) void handleCode(result.getText())
        },
      )
    } catch {
      setStatus('error')
      setMessage('没拿到摄像头权限，或设备没有摄像头。可以改用「拍一张条码」。')
      setLive(false)
    }
  }

  const decodeImage = async (file: File) => {
    setStatus('loading')
    setMessage('正在识别图片里的条码…')
    const url = URL.createObjectURL(file)
    try {
      const img = document.createElement('img')
      img.src = url
      await img.decode()
      const reader = new BrowserMultiFormatReader(makeHints())
      readerRef.current = reader

      let text = ''
      try {
        text = (await reader.decodeFromImageElement(img)).getText()
      } catch {
        text = ''
      }
      if (!text) {
        try {
          const canvas = document.createElement('canvas')
          const scale = Math.min(3, 1600 / Math.max(img.width, img.height))
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            const big = document.createElement('img')
            big.src = canvas.toDataURL('image/png')
            await big.decode()
            text = (await reader.decodeFromImageElement(big)).getText()
          }
        } catch {
          text = ''
        }
      }

      if (text) {
        await handleCode(text)
      } else {
        setStatus('error')
        setMessage('这张图里没解出条码。拍的时候让条码横平竖直、占满画面、别反光。')
      }
    } catch {
      setStatus('error')
      setMessage('图片读取失败，换一张试试。')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  // 识别成功后把商品回传出去。必须放 effect：在 render 里调 setState 会告警，还可能重复写入。
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  useEffect(() => {
    if (!found) return
    onPickRef.current(toFoodItem(found))
  }, [found])

  if (found) {
    return <div className="py-10 text-center text-[12px] text-muted">已识别，正在存入食物库…</div>
  }
  return (
    <div className="anim-rise space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
        {(!live || status !== 'scanning') && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 px-6 text-center">
            <p className="text-[11.5px] leading-5 text-white/80">
              {status === 'loading' ? message : message || '点「实时扫码」打开摄像头，或拍一张/从相册选'}
            </p>
          </div>
        )}
        {live && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-20 w-60 rounded-lg border-2 border-accent/80" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => void startLive()}
          className="rounded-xl border border-accent/50 bg-accent/15 py-2.5 text-[12px] text-accent active:scale-[0.98]"
        >
          📹 实时扫码
        </button>
        <button
          onClick={() => cameraInput.current?.click()}
          className="rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
        >
          📷 拍一张条码
        </button>
        <button
          onClick={() => galleryInput.current?.click()}
          className="rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
        >
          🖼 从相册选
        </button>
        <button
          onClick={() => {
            readerRef.current?.reset()
            setLive(false)
            setStatus('idle')
            setMessage('')
          }}
          className="rounded-xl border border-line bg-surface2/50 py-2.5 text-[12px] text-muted active:scale-[0.98]"
        >
          ⏹ 停止扫描
        </button>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void decodeImage(f)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void decodeImage(f)
          e.target.value = ''
        }}
      />

      <div className="rounded-2xl border border-line bg-surface2/40 p-3">
        <div className="mb-1.5 text-[12px] text-muted">或直接输入条码数字</div>
        <div className="flex gap-2">
          <TextField value={manual} onChange={setManual} placeholder="如 6921168509256" />
          <Button
            variant="soft"
            className="shrink-0 px-4"
            disabled={manual.trim().length < 6}
            onClick={() => void handleCode(manual.trim())}
          >
            查询
          </Button>
        </div>
      </div>

      {!secure && (
        <p className="px-1 text-[10px] leading-4 text-muted/45">
          提示：http 局域网地址下浏览器禁用摄像头。APK 内是 https://localhost，实时扫码可用。
        </p>
      )}
    </div>
  )
}
