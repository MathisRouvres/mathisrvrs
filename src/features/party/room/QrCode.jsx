import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** QR code en SVG (modules noirs sur fond blanc, lisible même en thème sombre). */
export default function QrCode({ value, size = 200, label }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const count = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + 4},${row + 4}h1v1h-1z`
      }
    }
    return { d, box: count + 8 }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${path.box} ${path.box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-2xl bg-white"
    >
      <path d={path.d} fill="#000" />
    </svg>
  )
}
