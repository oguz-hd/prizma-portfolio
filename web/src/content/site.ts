import type { RawSiteContent } from './types'

/**
 * Sitenin içeriği. Kaynak: docs/BRIEF.md § 0 (CV'den alınan kimlik).
 *
 * ⚠️ GEÇİCİ kaynak. Faz 6'da yerini content.json alacak, veritabanından beslenecek.
 * Şekli aynı kaldığı için o geçişte hiçbir bileşene dokunulmayacak.
 *
 * ⚠️ Metinler taslak — Faz 4'te kullanıcıyla birlikte gözden geçirilecek.
 */

export const SITE: RawSiteContent = {
  settings: {
    // Seçilen palet — docs/DESIGN.md § E
    preset: 'tayf',
    metaTitle: {
      tr: 'Oğuz Han Duran — Full-stack geliştirici',
      en: 'Oğuz Han Duran — Full-stack developer',
    },
    metaDescription: {
      tr: 'React, FastAPI ve .NET ile uçtan uca ürünler kuran full-stack geliştirici. İzmir.',
      en: 'Full-stack developer building end-to-end products with React, FastAPI and .NET. İzmir, Türkiye.',
    },
  },

  profile: {
    name: 'Oğuz Han Duran',
    title: { tr: 'Full-stack geliştirici', en: 'Full-stack developer' },
    location: { tr: 'İzmir', en: 'İzmir, Türkiye' },
    // ⚠️ Girişte artık GÖSTERİLMİYOR (kullanıcı isteği, Oturum 2: "mottoyu
    // kaldırmalıyız"). Alan sözleşmede (types.ts ↔ API) kaldığı için duruyor.
    tagline: {
      tr: 'E-postayla dönen işleri tek ekrana indiriyorum — arayüzünden veritabanına kadar.',
      en: 'I bring work that runs over email into a single screen — from the interface down to the database.',
    },
    // Mezuniyet paragrafı kullanıcı isteğiyle çıktı (Oturum 2) — bilgi Deneyim
    // ve Eğitim slaytında, eğitim kaydının notunda duruyor.
    bio: {
      tr: [
        'İşin iki ucunu da seviyorum: React ve Vue ile arayüz, FastAPI ve .NET Core ile servis, MySQL ve MSSQL ile veri. Bir ürünün nasıl göründüğü kadar nasıl ayakta durduğu da ilgimi çekiyor.',
        'Boş vakitlerimde spor yapıyor, müzik dinliyor ve teleskopla gözlem yapıyorum. Bu sitenin renkleri de oradan geliyor — bir yıldızın ne olduğunu ışığını tayfına ayırarak anlarsınız.',
      ],
      en: [
        'I like both ends of the job: interfaces with React and Vue, services with FastAPI and .NET Core, data with MySQL and MSSQL. How a product holds up interests me as much as how it looks.',
        'Outside work I train, listen to music, and observe through a telescope. This site gets its colours from that last one — you learn what a star is by splitting its light into a spectrum.',
      ],
    },

    // CV'den (docs/BRIEF.md § 0). Teknoloji adları çevrilmez — React her dilde React.
    /*
      Oturum 15'te sadeleşti (~20 → 10): yalnızca projelerde ve deneyimde
      kanıtlanan teknolojiler. curious.page: "içerik > teknoloji listesi".
      Sıra bio'nun cümlesini izliyor: arayüz → servis → veri.
      Çıkanlar: C, Django, Node.js, Express, JavaScript (TypeScript kapsıyor),
      Flutter, SQLite, Redis, RabbitMQ, Git.
    */
    skills: [
      {
        id: 'frontend',
        group: { tr: 'Ön yüz', en: 'Front end' },
        items: ['React.js', 'TypeScript', 'Vue.js'],
      },
      {
        id: 'backend',
        group: { tr: 'Servis', en: 'Back end' },
        items: ['FastAPI', 'Python', '.NET Core 8'],
      },
      {
        id: 'data',
        group: { tr: 'Veri ve altyapı', en: 'Data & infrastructure' },
        items: ['MySQL', 'MSSQL', 'Docker'],
      },
      {
        id: 'ai',
        group: { tr: 'Yapay zekâ', en: 'Machine learning' },
        // items yalnızca dilden bağımsız adlar taşır — açıklama note'a gider.
        items: ['LSTM'],
        note: { tr: 'Zaman serisi analizi', en: 'Time series analysis' },
      },
    ],

    experience: [
      {
        id: 'ege-iskur',
        org: 'Ege Üniversitesi Bergama MYO',
        role: { tr: 'İşkur kursiyeri', en: 'İşkur trainee' },
        period: '2025 — 2026',
        order: 1,
      },
      {
        id: 'lion-staj',
        org: 'Lion Bilişim / İstanbul Altın Rafinerisi',
        role: { tr: 'Stajyer geliştirici', en: 'Developer intern' },
        period: '2025',
        order: 2,
      },
      {
        id: 'lion-parttime',
        org: 'Lion Bilişim / İstanbul Altın Rafinerisi',
        role: { tr: 'Yarı zamanlı geliştirici', en: 'Part-time developer' },
        period: '2022 — 2023',
        order: 3,
      },
    ],

    education: [
      {
        id: 'ege',
        org: 'Ege Üniversitesi Bergama MYO',
        role: { tr: 'Bilgisayar Programcılığı', en: 'Computer Programming' },
        period: '05.2026',
        note: {
          tr: 'GNO 3.85/4 · Bölüm birincisi, okul ikincisi',
          en: 'GPA 3.85/4 · 1st in department, 2nd in school',
        },
        order: 1,
      },
      {
        id: 'lise',
        org: 'Eskişehir Beylikova Fen Lisesi',
        role: { tr: 'Fen Lisesi', en: 'Science High School' },
        period: '',
        order: 2,
      },
    ],
  },

  links: [
    {
      id: 'email',
      label: { tr: 'E-posta', en: 'Email' },
      href: 'mailto:drn4902@gmail.com',
      icon: 'mail',
      order: 1,
    },
    {
      id: 'github',
      label: { tr: 'GitHub', en: 'GitHub' },
      href: 'https://github.com/oguz-hd',
      icon: 'github',
      order: 2,
    },
    {
      id: 'linkedin',
      label: { tr: 'LinkedIn', en: 'LinkedIn' },
      href: 'https://linkedin.com/in/oguz-han-duran',
      icon: 'linkedin',
      order: 3,
    },
  ],

  // curious.page kuralı 2: 3-5 proje, bağlamıyla (problem, yığın, demo)
  projects: [
    {
      id: 'proje-portali',
      slug: 'universite-proje-portali',
      title: { tr: 'Üniversite Proje Portalı', en: 'University Project Portal' },
      summary: {
        tr: 'Öğrenci projelerinin toplandığı, danışman onayından geçtiği web portalı.',
        en: 'A web portal where student projects are submitted and pass through advisor approval.',
      },
      description: {
        tr: [
          'Bölümdeki proje teslimleri e-posta ve USB üzerinden yürüyordu; hangi sürümün son sürüm olduğu kimsenin elinde değildi.',
          'Portal, projeyi öğrenciden alıp danışman onay akışına sokuyor ve tek bir yerde arşivliyor. Ön yüz React, servis FastAPI, veri MySQL.',
        ],
        en: [
          'Project submissions ran over email and USB sticks; nobody could tell which version was the final one.',
          'The portal takes the project from the student, moves it through advisor approval, and archives everything in one place. React front end, FastAPI service, MySQL storage.',
        ],
      },
      tech: ['React.js', 'FastAPI', 'MySQL', 'Python'],
      order: 1,
      published: true,
    },
    {
      id: 'otopark',
      slug: 'otopark-yonetim-sistemi',
      title: { tr: 'Otopark Yönetim Sistemi', en: 'Car Park Management System' },
      summary: {
        tr: 'Giriş-çıkış takibi, doluluk ve ücretlendirme için masaüstü yönetim uygulaması.',
        en: 'Desktop application for entry/exit tracking, occupancy and billing.',
      },
      description: {
        tr: [
          'Plaka bazlı giriş-çıkış kaydı, anlık doluluk görünümü ve süreye göre otomatik ücretlendirme.',
          '.NET Core 8 üzerinde kuruldu, veriler MSSQL\u2019de tutuluyor.',
        ],
        en: [
          'Plate-based entry and exit records, live occupancy view, and automatic time-based billing.',
          'Built on .NET Core 8 with MSSQL for storage.',
        ],
      },
      tech: ['.NET Core 8', 'C#', 'MSSQL'],
      order: 2,
      published: true,
    },
    {
      id: 'restoran',
      slug: 'restoran-yonetim-sistemi',
      title: { tr: 'Restoran Yönetim Sistemi', en: 'Restaurant Management System' },
      summary: {
        tr: 'Masa, sipariş ve adisyon akışını tek ekranda toplayan yönetim uygulaması.',
        en: 'Management application bringing tables, orders and checks into one screen.',
      },
      description: {
        tr: [
          'Masa durumu, sipariş girişi ve adisyon kapatma tek akışta. Mutfak ve kasa aynı veriyi görüyor.',
          'Otopark sistemiyle aynı zemin: .NET Core 8 + MSSQL.',
        ],
        en: [
          'Table status, order entry and check closing in a single flow. Kitchen and till read the same data.',
          'Same foundation as the car park system: .NET Core 8 + MSSQL.',
        ],
      },
      tech: ['.NET Core 8', 'C#', 'MSSQL'],
      order: 3,
      published: true,
    },
  ],

  sections: [
    {
      id: 'hakkimda',
      slug: 'hakkimda',
      heading: { tr: 'Hakkımda', en: 'About' },
      // Bölüm gövdesi = başlığın altına düşen serbest metin. Hakkımda ve Projeler
      // için boş: içerikleri bio/proje kayıtlarından geliyor, giriş cümlesi
      // tekrar olurdu. Boş gövde hiç basılmıyor (Section.tsx).
      body: { tr: [], en: [] },
      order: 1,
    },
    {
      // Projeler bölümü kullanıcı isteğiyle kalktı (Oturum 2); yerine deneyim ve
      // eğitim kendi slaytında. Proje KAYITLARI (`projects`) yerinde duruyor —
      // bölüm geri eklenirse ön yüzde Projects bileşeni hazır (App.tsx eşlemesi).
      id: 'deneyim',
      slug: 'deneyim',
      heading: { tr: 'Deneyim ve Eğitim', en: 'Experience & Education' },
      body: { tr: [], en: [] },
      order: 2,
    },
    {
      id: 'iletisim',
      slug: 'iletisim',
      heading: { tr: 'İletişim', en: 'Contact' },
      // ★ Müsaitlik sinyali. Bilerek İÇERİK (arayüz metni değil): iş bulunca
      // panelden silinecek tek satır bu olsun, kod değişmesin.
      body: {
        tr: [
          'Mezun oldum, şu an yeni bir rol arıyorum. Uçtan uca sorumluluk aldığım — arayüzü de servisi de yazdığım — işler ilgimi çekiyor.',
        ],
        en: [
          'I’ve graduated and I’m looking for a new role. I’m drawn to work where I own things end to end — writing both the interface and the service.',
        ],
      },
      order: 3,
    },
  ],
}
