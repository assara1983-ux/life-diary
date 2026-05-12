// src/config/sectionGraphics.js
// Blueprint illustration mapping for all sections
// Images: mix-blend-mode: multiply on cream background #f5f0e1
// φ = 1.618 · Scale 1:500

export const sectionGraphics = {

  today: {
    // Арка с часами + фазы луны + меридианы
    image: '/assets/171ff1e39-e6b8-4002-9826-daaec582ec2e.png',
    alt:   'Life Diary Today — Архитектурная арка с часами и меридианами',
    scale: '1:500',
    caption: 'Meridian Clock · Moon Phase · TCM',
  },

  schedule: {
    // Часы с цветком жизни + шестерёнки + циркуль
    image: '/assets/1c714c63f-0aa6-40a5-8654-6f0d9e1d70f2.png',
    alt:   'Life Diary Schedule — Часы с цветком жизни и шестерёнками',
    scale: '1:1 · 36°',
    caption: 'Tempus · φ=1.618 · Flower of Life',
  },

  work: {
    // Здание КГД/БНС с колоннами и блок-схемой
    image: '/assets/1521806d8-9789-48f5-a1a9-432df05648fb.png',
    alt:   'Life Diary Work — Здание КГД/БНС с архитектурными колоннами',
    scale: '1:500',
    caption: 'KGD · BNS · Architectural Blueprint',
  },

  home: {
    // Цветок жизни + гексагоны Tasks/Progress
    image: '/assets/1a2d2fd90-904a-487c-a36d-24be081ec7fe.png',
    alt:   'Life Diary Home — Цветок жизни и гексагональная структура',
    scale: '1:1',
    caption: 'Flower of Life · Home Geometry',
  },

  shopping: {
    // Два здания-рынка с колоннами + список покупок
    image: '/assets/1c09621a8-7c3a-4955-840e-d8d36b67a2b2.png',
    alt:   'Life Diary Shopping — Два рынка с колоннами',
    scale: '1:10',
    caption: 'Groceries · Personal Care · Abundance',
    fallback: '/assets/1a80172ac-d5e9-442b-9197-f89ea91f4ad7.png',
  },

  pets: {
    // Кошка в круге из лап с циркулем и линейкой
    image: '/assets/18a906b53-22db-4824-8470-e9bfdbfd7705.png',
    alt:   'Life Diary Pets — Питомец в геометрическом круге',
    scale: 'R·4mm',
    caption: 'Sacred Geometry · Companion Bond',
  },

  car: {
    // Технический чертёж автомобиля + стрелки
    image: '/assets/1fafdfbef-2a99-45e9-a8f7-bca88e3674b4.png',
    alt:   'Life Diary Car — Технический чертёж автомобиля',
    scale: '1:1',
    caption: 'Vehicle Blueprint · Technical Inspection',
  },

  health: {
    // Храм с меридианами в колоннах + солнечные часы + анатомия
    image: '/assets/1fa965777-cf4e-4ec1-981c-48e9da5af19e-1.png',
    alt:   'Life Diary Health — TCM Храм с меридианами и солнечными часами',
    scale: '1:20',
    caption: 'TCM Temple · Meridians · Sundial Clock',
  },

  beauty: {
    // Лотос Beauty — Face/Body/Hair Care φ=1.618
    image: '/assets/1da2110b6-6985-4337-bbcd-91c98178de23.png',
    alt:   'Life Diary Beauty — Золотой лотос с лунным циклом',
    scale: 'φ=1.618',
    caption: 'Face · Body · Hair · Lunar Cycle',
  },

  hobbies: {
    // Радар пятиугольник φ=1.618 с циркулем
    image: '/assets/186363866-323f-494e-93db-9b2b7b33cce7.png',
    alt:   'Life Diary Hobbies — Пятиугольный радар с золотым сечением',
    scale: 'R·4mm · L120mm',
    caption: 'Wheel of Life · φ=1.618 · Compass',
  },

  goals: {
    // Колесо целей с храмами по сферам
    image: '/assets/12750a116-f13d-4ff6-8a18-ad62a7b6b681.png',
    alt:   'Life Diary Goals — Колесо жизни с архитектурными храмами',
    scale: '1:500',
    caption: 'Wheel of Life · Sacred Architecture',
  },

  mental: {
    // Голова с цветком жизни и медитирующей фигурой
    image: '/assets/17319bb09-70a2-48ae-aede-0c1c837ab406.png',
    alt:   'Life Diary Mental — Голова с сакральной геометрией и медитацией',
    scale: 'φ=1.618 · 45°',
    caption: 'Sacred Geometry · Mental Health · Flower of Life',
  },

  travel: {
    // Арка + компас + бюджет Dream→Reality
    image: '/assets/110a2631e-2935-4b77-8628-9dbb9b33885a.png',
    alt:   'Life Diary Travel — Архитектурная арка с компасом',
    scale: '1:500',
    caption: 'Compass · Dream → Reality · Budget',
  },

  journal: {
    // Спираль Фибоначчи с циркулем и линейкой
    image: '/assets/13fbe99c0-6007-47f8-a023-a130ae27cf5d.png',
    alt:   'Life Diary Journal — Спираль Фибоначчи с инструментами',
    scale: 'R·24mm · L·120mm',
    caption: 'Fibonacci Spiral · Day Tracker · 1:1',
  },

  profile: {
    // Астрологическое колесо с фигурой человека
    image: '/assets/196f2d305-89f5-4adc-a98a-5eb5e701a48f.png',
    alt:   'Life Diary Profile — Астрологическое колесо с человеческой фигурой',
    scale: 'φ=1.618',
    caption: 'Astrology Wheel · Sacred Body · Compass',
  },

  // Дополнительные изображения (альтернативы)
  _extra: {
    today_v2:    '/assets/1d4051e2d-a703-4b35-9740-5c00482ca280.png',
    health_v2:   '/assets/1112caab8-b8cc-4615-82c3-0e3aeaab4ef3.png',
    health_v3:   '/assets/140c6507a-d5f7-403d-867f-b0d31b175073.png',
    health_v4:   '/assets/1bcee1836-e4e8-44fd-bc12-221e3d3426b2.png',
    work_v2:     '/assets/1684b921c-6984-4d36-ac37-23f33d84d4f2.png',
    work_sfinco: '/assets/1684b921c-6984-4d36-ac37-23f33d84d4f2-1.png',
    travel_v2:   '/assets/1167b0a84-95db-4d04-a70f-79cf0528d657.png',
    travel_v3:   '/assets/1683085e6-b08b-43f1-8777-29c2fb495b75-1.png',
    travel_v4:   '/assets/1d1fe4bff-3a75-431c-9ff9-e6b257bc073a.png',
    goals_v2:    '/assets/12750a116-f13d-4ff6-8a18-ad62a7b6b681-1.png',
    goals_v3:    '/assets/1a80172ac-d5e9-442b-9197-f89ea91f4ad7.png',
    car_v2:      '/assets/1330ecdb3-97fc-4e03-b5ea-39a3abf9ba45.png',
    onboarding:  '/assets/1edfad4ef-9d33-419a-9f42-62a15e3531cc.png',
    habits:      '/assets/13c14c9f0-590f-413e-8c1a-a19c3cb15e8b.png',
    finance:     '/assets/1ed91db9f-8f2b-40fb-a1e6-78f305639f12.png',
  },
};

export function getSectionGraphic(sectionId) {
  return sectionGraphics[sectionId] || null;
}
