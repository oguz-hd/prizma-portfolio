// Harness: gerçek presets.ts'i sarar. window.name'deki seçenek token'ları Tayf'ın yerine
// geçer (site içeriği Tayf'ı seçiyor; panel paintPanel → Tayf). Diğerleri olduğu gibi.
import { PRESETS as REAL } from 'real:presets'
import { cfg } from './cfg'

const t = cfg().tokens
export const PRESETS = t ? { ...REAL, tayf: { ...REAL.tayf, tokens: t } } : REAL
export const PRESET_LIST = Object.values(PRESETS)
