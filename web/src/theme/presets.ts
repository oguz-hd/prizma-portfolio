import type { Preset, PresetId } from './types'

/**
 * ★ PROJEDEKİ TEK HEX BARINDIRAN DOSYA.
 *
 * Başka hiçbir .ts/.tsx/.css dosyasında renk kodu geçmeyecek. Sebebi:
 * admin paneli renkleri düzenleyebilecek, dolayısıyla renkler CSS'e
 * sabitlenemez — veri olmak zorundalar.
 *
 * Tek bilinçli istisna: index.html'deki sayfa-öncesi zemin rengi
 * (beyaz flaşı önlemek için, JS çalışmadan önce gerekli).
 *
 * ⚠️ Panelde ham renk seçici OLMAYACAK. Kullanıcı bu ön ayarlar arasından
 * seçecek ve üzerinde sınırlı ince ayar yapabilecek — kontrast doğrulamasıyla.
 * Serbest renk seçici tasarımı yok eder: okunmaz metin, bozuk palet.
 * Gerekçe: docs/ARCHITECTURE.md § 4
 *
 * ⚠️ `accents` KISA dalga boyundan UZUNA sıralı (types.ts'teki nota bak) —
 * prizma bu sırayla kırıyor.
 */

export const PRESETS: Record<PresetId, Preset> = {
  /**
   * ✅ SEÇİLEN PALET (prizma-portfolio, kullanıcı kararı).
   * Yedi ton: mor · mavi · camgöbeği · yeşil · sarı · turuncu · kırmızı.
   * trex-portfolio'daki Tayf altı tondu, camgöbeği eksikti — prizma tam tayfı
   * gösterdiği için boşluk görünür oluyordu. Camgöbeği lead ile aynı ton: lider
   * rengin tayfta bir yeri var.
   */
  tayf: {
    id: 'tayf',
    name: 'Tayf',
    note: 'Tam tayf, prizma dağılımı. Teleskopla gözlem yapan birinin renkleri.',
    tokens: {
      ground: '#070A12',
      surface: '#0F1420',
      line: '#1C2436',
      ink: '#E4E9F4',
      inkDim: '#98A2BA',
      inkFaint: '#7C879F',
      lead: '#22D3EE',
      accents: ['#A78BFA', '#60A5FA', '#22D3EE', '#4ADE80', '#FACC15', '#FB923C', '#F87171'],
    },
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora',
    note: 'Tayfın soğuk ucu. Kutup ışıkları — yalnızca karanlık gökte görülür.',
    tokens: {
      ground: '#080B12',
      surface: '#0E1420',
      line: '#1B2534',
      ink: '#E2E8F2',
      inkDim: '#94A0B4',
      // Daha soluk tonlar ground üzerinde 4.5:1'in altına düşüyordu.
      inkFaint: '#7A8AA0',
      lead: '#34D399',
      accents: ['#E879F9', '#C084FC', '#818CF8', '#60A5FA', '#22D3EE'],
    },
  },

  yildiz: {
    id: 'yildiz',
    name: 'Yıldız Tayfı',
    note: 'Gerçek yıldız renkleri — OBAFGKM sınıflandırması. Sıcak mavi, soğuk kırmızı.',
    tokens: {
      ground: '#05070D',
      surface: '#0D1119',
      line: '#1A2130',
      ink: '#EDEFF6',
      inkDim: '#8B93A8',
      inkFaint: '#737C92',
      lead: '#AABFFF',
      accents: ['#9BB0FF', '#CAD8FF', '#F6F5FF', '#FFF0D4', '#FFD2A1', '#FF9E5E'],
    },
  },

  turbo: {
    id: 'turbo',
    name: 'Turbo',
    note: "Google'ın mühendislik gökkuşağı. Algısal olarak düzeltilmiş tayf.",
    tokens: {
      ground: '#0A0A10',
      surface: '#12121A',
      line: '#20202C',
      ink: '#E7E7EC',
      inkDim: '#8E8E9C',
      inkFaint: '#787888',
      lead: '#1BCFD4',
      accents: ['#4675ED', '#24ECA6', '#A4FC3B', '#F3C63A', '#FE9B2D', '#D93806'],
    },
  },
}

export const PRESET_LIST: Preset[] = Object.values(PRESETS)
