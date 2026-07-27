import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  completeSeason,
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
} from './index'
import type { CareerSavePackage } from './types'

const ROOT = process.cwd()

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walkTs(full, acc)
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(full)
    }
  }
  return acc
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('déterminisme — aucun Math.random dans la logique métier', () => {
  it('seul le générateur d’identifiants/seed y recourt', () => {
    // ids.ts : génération d'identifiants/seed au démarrage (non déterministe par
    // nature, sans effet sur le parcours une fois la seed fixée).
    const allow = new Set(['src/game-engine/core/ids.ts'])
    const files = [
      ...walkTs(join(ROOT, 'src/game-engine')),
      ...walkTs(join(ROOT, 'src/game-content')),
    ]
    const offenders: string[] = []
    for (const file of files) {
      const rel = relative(ROOT, file)
      if (allow.has(rel)) continue
      if (/Math\.random\s*\(/.test(stripComments(readFileSync(file, 'utf8')))) {
        offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })
})

/** Joue N saisons en choisissant toujours la première option. */
function playRun(seed: string, seasons: number): CareerSavePackage {
  let pkg = createCareer({
    countryId: 'capitale-miroir',
    macroPosition: 'midfielder',
    seed,
  })
  for (let s = 0; s < seasons; s += 1) {
    if (pkg.snapshot.state.careerStage === 'carriere_terminee') break
    const d1 = getNextDilemma(pkg)
    if (!d1) break
    pkg = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id).package
    const d2 = getNextDilemma(pkg)
    if (!d2) break
    pkg = resolveDilemmaChoice(pkg, d2, d2.choices[0]!.id).package
    pkg = completeSeason(pkg).package
  }
  return pkg
}

describe('déterminisme — même seed, même parcours', () => {
  it('le choix des événements dépend de la seed (reproductible)', () => {
    const a = createCareer({ countryId: 'capitale-miroir', macroPosition: 'midfielder', seed: 'det-seed' })
    const b = createCareer({ countryId: 'capitale-miroir', macroPosition: 'midfielder', seed: 'det-seed' })
    expect(getNextDilemma(a)!.id).toBe(getNextDilemma(b)!.id)
  })

  it('mêmes décisions + même seed → état de jeu identique', () => {
    const a = playRun('repro-abc', 4).snapshot.state
    const b = playRun('repro-abc', 4).snapshot.state
    expect(a.stats).toEqual(b.stats)
    expect(a.resources).toEqual(b.resources)
    expect(a.careerStage).toBe(b.careerStage)
    expect(a.seasonIndex).toBe(b.seasonIndex)
  })

  it('les systèmes économiques (Phase 2/3) sont déterministes', () => {
    const a = playRun('repro-eco', 4).snapshot.state
    const b = playRun('repro-eco', 4).snapshot.state
    expect(a.finances.cash).toBe(b.finances.cash)
    expect(a.wealth).toEqual(b.wealth)
    expect(a.contract).toEqual(b.contract)
    expect(a.sponsorships).toEqual(b.sponsorships)
    expect(a.agentId).toBe(b.agentId)
    expect(a.lifestyle).toBe(b.lifestyle)
  })
})
