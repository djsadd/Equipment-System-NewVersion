export type Lang = 'id' | 'ru' | 'en' | 'kk'

export const dashboardCopy: Record<
  Lang,
  {
    title: string
    greeting: string
    nav: string[]
    equipment: {
      title: string
      items: string[]
    }
    reports: {
      title: string
      items: string[]
    }
    cabinets: string
    admin: string
    cards: string[]
    panels: {
      title: string
      hint: string
      rows: { label: string; value: string }[]
    }[]
    quick: { label: string; value: string }[]
  }
> = {
  id: {
    title: 'Dashboard Sistem Manajemen Inventaris & Peralatan',
    greeting: 'Halo, Nama!',
    nav: ['Dashboard', 'Inventaris', 'Pemeliharaan', 'Notifikasi', 'Pengaturan'],
    equipment: {
      title: 'Peralatan',
      items: ['Penerbitan Peralatan', 'Peralatan Saya', 'Pengembalian'],
    },
    reports: {
      title: 'Laporan',
      items: [
        'Audit',
        'Komputer',
        'Peralatan',
        'Cartridge',
        'Inventaris',
        'Unggahan',
      ],
    },
    cabinets: 'Ruangan',
    admin: 'Admin',
    cards: ['Manajer Aset', 'Supervisor', 'Tim Operasional', 'Laporan'],
    panels: [
      {
        title: 'Inventory',
        hint: 'Go to Configuration',
        rows: [
          { label: 'Total Items', value: '1,248' },
          { label: 'Equipment Groups', value: '24' },
        ],
      },
      {
        title: 'Assets',
        hint: 'Go to Assets Page',
        rows: [
          { label: 'Assigned Assets', value: '845' },
          { label: 'Most Used Item', value: 'ThinkPad T14' },
        ],
      },
      {
        title: 'Warehouses',
        hint: 'Go to Location Management',
        rows: [
          { label: 'Total Locations', value: '04' },
          { label: 'Active Users', value: '52' },
        ],
      },
      {
        title: 'Quick Report',
        hint: 'January 2026',
        rows: [
          { label: 'Transfers', value: '2,885' },
          { label: 'Write-off Acts', value: '97' },
        ],
      },
    ],
    quick: [
      { label: 'Total Items', value: '1,248' },
      { label: 'Equipment Groups', value: '24' },
      { label: 'Assigned Assets', value: '845' },
      { label: 'Most Used Item', value: 'ThinkPad T14' },
    ],
  },
  ru: {
    title: 'Панель управления оборудованием и инвентарём',
    greeting: 'Роль: Инженер по эксплуатации',
    nav: ['Дашборд', 'Инвентарь', 'Обслуживание', 'Уведомления', 'Настройки'],
    equipment: {
      title: 'Оборудование',
      items: ['Выдача оборудования', 'Моё оборудование', 'Возврат'],
    },
    reports: {
      title: 'Отчёты',
      items: [
        'Аудит',
        'Компьютеры',
        'Оборудование',
        'Картриджи',
        'Инвентарь',
        'Загрузка',
      ],
    },
    cabinets: 'Кабинеты',
    admin: 'Администрирование',
    cards: [
      'Обзор активов',
      'Текущие задачи',
      'Операционная команда',
      'Отчёты',
    ],
    panels: [
      {
        title: 'Инвентарь',
        hint: 'Перейти к конфигурации',
        rows: [
          { label: 'Всего единиц', value: '1 248' },
          { label: 'Группы оборудования', value: '24' },
        ],
      },
      {
        title: 'Активы',
        hint: 'Перейти к активам',
        rows: [
          { label: 'Назначено', value: '845' },
          { label: 'Самое используемое', value: 'ThinkPad T14' },
        ],
      },
      {
        title: 'Склады',
        hint: 'Управление локациями',
        rows: [
          { label: 'Всего локаций', value: '04' },
          { label: 'Активные пользователи', value: '52' },
        ],
      },
      {
        title: 'Краткий отчёт',
        hint: 'Февраль 2026',
        rows: [
          { label: 'Перемещения', value: '2 885' },
          { label: 'Акты списания', value: '97' },
        ],
      },
    ],
    quick: [
      { label: 'Всего единиц', value: '1 248' },
      { label: 'Группы оборудования', value: '24' },
      { label: 'Назначено', value: '845' },
      { label: 'Самое используемое', value: 'ThinkPad T14' },
    ],
  },
  en: {
    title: 'Equipment & Inventory Management Dashboard',
    greeting: 'Hello, Name!',
    nav: ['Dashboard', 'Inventory', 'Maintenance', 'Notifications', 'Settings'],
    equipment: {
      title: 'Equipment',
      items: ['Issue Equipment', 'My Equipment', 'Return'],
    },
    reports: {
      title: 'Reports',
      items: [
        'Audit',
        'Computers',
        'Equipment',
        'Cartridges',
        'Inventory',
        'Upload',
      ],
    },
    cabinets: 'Rooms',
    admin: 'Admin',
    cards: ['Asset Manager', 'Supervisor', 'Operations', 'Report'],
    panels: [
      {
        title: 'Inventory',
        hint: 'Go to Configuration',
        rows: [
          { label: 'Total Items', value: '1,248' },
          { label: 'Equipment Groups', value: '24' },
        ],
      },
      {
        title: 'Assets',
        hint: 'Go to Assets Page',
        rows: [
          { label: 'Assigned Assets', value: '845' },
          { label: 'Most Used Item', value: 'ThinkPad T14' },
        ],
      },
      {
        title: 'Warehouses',
        hint: 'Go to Location Management',
        rows: [
          { label: 'Total Locations', value: '04' },
          { label: 'Active Users', value: '52' },
        ],
      },
      {
        title: 'Quick Report',
        hint: 'January 2026',
        rows: [
          { label: 'Transfers', value: '2,885' },
          { label: 'Write-off Acts', value: '97' },
        ],
      },
    ],
    quick: [
      { label: 'Total Items', value: '1,248' },
      { label: 'Equipment Groups', value: '24' },
      { label: 'Assigned Assets', value: '845' },
      { label: 'Most Used Item', value: 'ThinkPad T14' },
    ],
  },
  kk: {
    title: 'Жабдықтар мен түгендеуді басқару дашборды',
    greeting: 'Сәлем, Аты!',
    nav: ['Дашборд', 'Түгендеу', 'Техникалық қызмет', 'Хабарламалар', 'Баптаулар'],
    equipment: {
      title: 'Жабдықтар',
      items: ['Жабдық беру', 'Менің жабдығым', 'Қайтару'],
    },
    reports: {
      title: 'Есептер',
      items: [
        'Аудит',
        'Компьютерлер',
        'Жабдықтар',
        'Картридждер',
        'Түгендеу',
        'Жүктеу',
      ],
    },
    cabinets: 'Кабинеттер',
    admin: 'Әкімшілендіру',
    cards: ['Актив менеджері', 'Супервайзер', 'Операциялар', 'Есеп'],
    panels: [
      {
        title: 'Түгендеу',
        hint: 'Баптауларға өту',
        rows: [
          { label: 'Жалпы саны', value: '1,248' },
          { label: 'Жабдық топтары', value: '24' },
        ],
      },
      {
        title: 'Активтер',
        hint: 'Активтер бетіне өту',
        rows: [
          { label: 'Бекітілген', value: '845' },
          { label: 'Ең жиі қолданылатын', value: 'ThinkPad T14' },
        ],
      },
      {
        title: 'Қоймалар',
        hint: 'Локацияларды басқару',
        rows: [
          { label: 'Локациялар саны', value: '04' },
          { label: 'Белсенді пайдаланушылар', value: '52' },
        ],
      },
      {
        title: 'Қысқаша есеп',
        hint: 'Қаңтар 2026',
        rows: [
          { label: 'Ауыстырулар', value: '2,885' },
          { label: 'Есептен шығару актілері', value: '97' },
        ],
      },
    ],
    quick: [
      { label: 'Жалпы саны', value: '1,248' },
      { label: 'Жабдық топтары', value: '24' },
      { label: 'Бекітілген', value: '845' },
      { label: 'Ең жиі қолданылатын', value: 'ThinkPad T14' },
    ],
  },
}
