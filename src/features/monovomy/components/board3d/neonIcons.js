/** Icônes néon en trait, dessinées sur un canvas 2D (centrées cx,cy, taille s). */
export function drawIcon(ctx, name, cx, cy, s, color) {
  ctx.save()
  ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.lineWidth = Math.max(3, s * 0.09); ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  ctx.shadowColor = color; ctx.shadowBlur = s * 0.5
  const P = (x, y) => [cx + x * s, cy + y * s]
  const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) }); ctx.stroke() }
  switch (name) {
    case 'glass': line([[-.28, -.32], [-.22, .34], [.22, .34], [.28, -.32]]); line([[-.3, -.32], [.3, -.32]]); break
    case 'shot': line([[-.2, -.22], [-.16, .3], [.16, .3], [.2, -.22], [-.2, -.22]]); break
    case 'whisky': { line([[-.28, -.28], [-.22, .32], [.22, .32], [.28, -.28], [-.28, -.28]]); const [a, b] = P(-.08, .05); ctx.strokeRect(a, b, s * .16, s * .16) } break
    case 'martini': { line([[-.34, -.3], [0, .08], [.34, -.3]]); line([[-.34, -.3], [.34, -.3]]); line([[0, .08], [0, .34]]); line([[-.16, .34], [.16, .34]]); ctx.beginPath(); const [x, y] = P(.16, -.16); ctx.arc(x, y, s * .06, 0, 7); ctx.stroke() } break
    case 'wine': { ctx.beginPath(); const [x, y] = P(0, -.12); ctx.arc(x, y, s * .26, 0.15, Math.PI - 0.15); ctx.stroke(); line([[0, .12], [0, .34]]); line([[-.16, .34], [.16, .34]]) } break
    case 'beer': line([[-.3, -.28], [-.3, .32], [.14, .32], [.14, -.28], [-.3, -.28]]); line([[.14, -.16], [.32, -.16], [.32, .12], [.14, .12]]); line([[-.26, -.28], [-.06, -.4], [.1, -.28]]); break
    case 'champagne': line([[-.24, -.3], [-.2, .28], [-.12, .34]]); line([[-.24, -.3], [-.08, -.3]]); line([[.24, -.3], [.2, .28], [.12, .34]]); line([[.24, -.3], [.08, -.3]]); break
    case 'dice': { const [a, b] = P(-.3, -.3); ctx.strokeRect(a, b, s * .6, s * .6);[[-.12, -.12], [.12, .12], [-.12, .12], [.12, -.12], [0, 0]].forEach((d) => { ctx.beginPath(); const [x, y] = P(d[0], d[1]); ctx.arc(x, y, s * .05, 0, 7); ctx.fill() }) } break
    case 'cards': ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.2); ctx.strokeRect(-s * .26, -s * .32, s * .4, s * .56); ctx.restore(); ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.18); ctx.strokeRect(-s * .14, -s * .3, s * .4, s * .56); ctx.restore(); break
    case 'star': { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? s * .16 : s * .34; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) } ctx.closePath(); ctx.stroke() } break
    case 'receipt': { const [a, b] = P(-.24, -.34); ctx.strokeRect(a, b, s * .48, s * .68);[-.16, -.02, .12].forEach((yy) => line([[-.14, yy], [.14, yy]])) } break
    case 'car': { line([[-.32, .06], [-.24, -.12], [.24, -.12], [.32, .06], [.32, .2], [-.32, .2], [-.32, .06]]); let [x, y] = P(-.18, .2); ctx.beginPath(); ctx.arc(x, y, s * .08, 0, 7); ctx.stroke();[x, y] = P(.18, .2); ctx.beginPath(); ctx.arc(x, y, s * .08, 0, 7); ctx.stroke() } break
    case 'cheers': ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.25); glass2(ctx, s, -.28); ctx.restore(); ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.25); glass2(ctx, s, .28); ctx.restore(); break
    case 'drop': ctx.beginPath(); ctx.moveTo(cx, cy - s * .34); ctx.bezierCurveTo(cx + s * .34, cy, cx + s * .22, cy + s * .34, cx, cy + s * .34); ctx.bezierCurveTo(cx - s * .22, cy + s * .34, cx - s * .34, cy, cx, cy - s * .34); ctx.stroke(); break
    case 'arrow': line([[-.3, 0], [.24, 0]]); line([[.06, -.2], [.3, 0], [.06, .2]]); break
    case 'party': { line([[-.26, .3], [0, -.34], [.26, .3], [-.26, .3]]);[[-.06, -.05], [.08, .08], [-.1, .15]].forEach((d) => { ctx.beginPath(); const [x, y] = P(d[0], d[1]); ctx.arc(x, y, s * .04, 0, 7); ctx.fill() }) } break
    default: ctx.beginPath(); ctx.arc(cx, cy, s * .28, 0, 7); ctx.stroke()
  }
  ctx.restore()
}
function glass2(ctx, s, dx) { ctx.beginPath(); ctx.moveTo((dx - .14) * s, -.28 * s); ctx.lineTo((dx - .1) * s, .28 * s); ctx.lineTo((dx + .1) * s, .28 * s); ctx.lineTo((dx + .14) * s, -.28 * s); ctx.stroke() }
