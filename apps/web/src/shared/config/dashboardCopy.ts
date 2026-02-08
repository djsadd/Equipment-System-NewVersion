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
        'Printer',
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
    title: 'Панель управления оборудованием',
    greeting: 'Роль: Инженер по эксплуатации',
    nav: ['Дашборд', 'Инвентаризация', 'Обслуживание', 'Уведомления', 'Настройки'],
    equipment: {
      title: 'Оборудование',
      items: ['Выдача оборудования', 'Моё оборудование', 'Возврат'],
    },
    reports: {
      title: 'Отчеты',
      items: [
        'Принтеры',
        'Компьютеры',
        'Оборудование',
        'Картриджи',
        'Инвентаризация',
        'Загрузка',
      ],
    },
    cabinets: 'Кабинеты',
    admin: 'Администрирование',
    cards: ['Обзор активов', 'Текущие задачи', 'Сервисный уровень', 'Ключевые отчеты'],
    panels: [
      {
        title: 'Инвентаризация',
        hint: 'Открыть комнаты',
        rows: [
          { label: 'Проверено комнат', value: '49 из 64' },
          { label: 'Просрочено', value: '4' },
        ],
      },
      {
        title: 'Активы',
        hint: 'Открыть реестр',
        rows: [
          { label: 'В эксплуатации', value: '985' },
          { label: 'На складе', value: '211' },
        ],
      },
      {
        title: 'Обслуживание',
        hint: 'Открыть задачи',
        rows: [
          { label: 'Заявок в работе', value: '26' },
          { label: 'Срочных', value: '8' },
        ],
      },
      {
        title: 'Отчет',
        hint: 'Февраль 2026',
        rows: [
          { label: 'Перемещения', value: '1,284' },
          { label: 'Акты списания', value: '12' },
        ],
      },
    ],
    quick: [
      { label: 'Всего единиц', value: '1 248' },
      { label: 'В эксплуатации', value: '985' },
      { label: 'Низкие остатки', value: '14' },
      { label: 'Инциденты за месяц', value: '38' },
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
        'Printers',
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
        'Принтерлер',
        'Компьютерлер',
        'Жабдықтар',
        'Картридждер',
        'Түгендеу',
        'Жүктеу',
      ],
    },
    cabinets: 'Кабинеттер',
    admin: 'Әкімшілендіру',
    cards: ['Актив менеджері', 'Супервайзер', 'Операциялық қызмет', 'Есеп'],
    panels: [
      {
        title: 'Түгендеу',
        hint: 'Баптауларға өту',
        rows: [
          { label: 'Барлығы', value: '1,248' },
          { label: 'Жабдық топтары', value: '24' },
        ],
      },
      {
        title: 'Активтер',
        hint: 'Реестрге өту',
        rows: [
          { label: 'Қолданыста', value: '845' },
          { label: 'Жиі қолданылатын', value: 'ThinkPad T14' },
        ],
      },
      {
        title: 'Қоймалар',
        hint: 'Локацияларды басқару',
        rows: [
          { label: 'Қоймалар саны', value: '04' },
          { label: 'Белсенді пайдаланушылар', value: '52' },
        ],
      },
      {
        title: 'Есеп',
        hint: 'Қаңтар 2026',
        rows: [
          { label: 'Ауыстыру', value: '2,885' },
          { label: 'Есептен шығару актілері', value: '97' },
        ],
      },
    ],
    quick: [
      { label: 'Барлығы', value: '1,248' },
      { label: 'Жабдық топтары', value: '24' },
      { label: 'Қолданыста', value: '845' },
      { label: 'Жиі қолданылатын', value: 'ThinkPad T14' },
    ],
  },
}
