/**
 * Wine Tasting Journal & Preference Engine (紅酒品飲與喜好分析引擎)
 * 包含 1~5 星級評分與酒標照片拍照上傳/預覽/壓縮功能
 */

// Storage keys
const STORAGE_KEY = 'wine_journal_records_v1';
const CLOUD_CONFIG_KEY = 'wine_journal_cloud_cfg';
const USERNAME_KEY = 'wine_journal_username';

const DEFAULT_SUPABASE_URL = 'https://hozanozxyuvpbwhrvxck.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Ev7uc5vbCnOYWsfoplkvbw_Gi09U9jE';

// State
const savedCloud = localStorage.getItem(CLOUD_CONFIG_KEY);
let cloudConfig = { enabled: true, supabaseUrl: DEFAULT_SUPABASE_URL, supabaseKey: DEFAULT_SUPABASE_KEY };
if (savedCloud) {
  try {
    const parsed = JSON.parse(savedCloud);
    if (parsed && parsed.supabaseUrl) {
      cloudConfig = parsed;
    }
  } catch (e) {}
}

let state = {
  wines: [],
  activeTab: 'cellar', // 'cellar' | 'add' | 'analytics' | 'sync'
  searchTerm: '',
  selectedType: 'all',
  selectedRepurchase: 'all',
  selectedRatingFilter: 'all', // 'all' | '5' | '4plus' | '3plus'
  selectedSort: 'newest',
  editingWineId: null,
  currentUser: localStorage.getItem(USERNAME_KEY) || '品酒愛好者',
  cloudConfig: cloudConfig,
  matcherInput: {
    type: '紅酒',
    body: '飽滿',
    tannin: '適中',
    acidity: '中',
    sweetness: '乾型',
    grape: '',
    country: '',
    selectedFlavors: []
  }
};

// Form Sensory State for Add/Edit
let formSensory = {
  body: '飽滿',
  tannin: '柔和',
  acidity: '中',
  sweetness: '乾型',
  rating: 4,
  image: '',
  flavors: []
};

// Preset lists for convenient UI
const PRESET_FLAVORS = [
  // 黑色水果
  { category: '黑色水果', tag: '黑色水果', icon: '🫐' },
  { category: '黑色水果', tag: '黑莓', icon: '🫐' },
  { category: '黑色水果', tag: '黑櫻桃', icon: '🍒' },
  { category: '黑色水果', tag: '藍莓', icon: '🫐' },
  // 紅色水果
  { category: '紅色水果', tag: '紅色水果', icon: '🍓' },
  { category: '紅色水果', tag: '櫻桃', icon: '🍒' },
  { category: '紅色水果', tag: '草莓', icon: '🍓' },
  { category: '紅色水果', tag: '覆盆子', icon: '🍓' },
  // 桶陳與香氣
  { category: '桶陳風味', tag: '橡木', icon: '🪵' },
  { category: '桶陳風味', tag: '香草', icon: '🍦' },
  { category: '桶陳風味', tag: '烤麵包', icon: '🍞' },
  { category: '桶陳風味', tag: '巧克力', icon: '🍫' },
  { category: '桶陳風味', tag: '堅果', icon: '🌰' },
  // 香料與草本
  { category: '香料草本', tag: '辛香料', icon: '🌶️' },
  { category: '香料草本', tag: '黑胡椒', icon: '🧂' },
  { category: '香料草本', tag: '泥土', icon: '🌱' },
  { category: '香料草本', tag: '青椒', icon: '🫑' },
  // 特色與白酒/甜酒
  { category: '口感與風格', tag: '柔和單寧', icon: '✨' },
  { category: '口感與風格', tag: '緊實單寧', icon: '🧱' },
  { category: '口感與風格', tag: '高酸', icon: '🍋' },
  { category: '口感與風格', tag: '風乾', icon: '🍇' },
  { category: '口感與風格', tag: '老藤', icon: '🪴' },
  { category: '花果氣泡', tag: '果香', icon: '🍎' },
  { category: '花果氣泡', tag: '花香', icon: '🌸' },
  { category: '花果氣泡', tag: '荔枝', icon: '🍈' },
  { category: '花果氣泡', tag: '礦物', icon: '🪨' },
  { category: '花果氣泡', tag: '氣泡', icon: '🫧' },
  { category: '花果氣泡', tag: '微甜', icon: '🍯' }
];

const PRESET_STORES = ['好市多 (Costco)', '全聯', '家樂福', 'citySuper', '專賣酒商', '愛買', '大潤發', '餐廳', '朋友聚會'];
const PRESET_GRAPES = [
  '黑皮諾（Pinot Noir）',
  '卡本內蘇維濃（Cabernet Sauvignon）',
  '梅洛（Merlot）',
  '希哈/希拉茲（Syrah/Shiraz）',
  '馬爾貝克（Malbec）',
  '田帕尼優（Tempranillo）',
  '桑嬌維塞（Sangiovese）',
  '格那希（Garnacha）',
  '金芬黛（Zinfandel）',
  '內比奧羅（Nebbiolo）',
  '夏多內（Chardonnay）',
  '白蘇維濃（Sauvignon Blanc）',
  '麝香葡萄（Moscato）',
  '麗絲玲（Riesling）',
  '混釀（Blend）'
];

// Lightweight inline SVG icons (Zero DOM mutation, 60 FPS instantaneous render)
const ICONS = {
  star: (filled = false, cls = 'w-3 h-3') => filled 
    ? `<svg class="${cls} fill-amber-400 text-amber-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    : `<svg class="${cls} text-gray-200 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  wine: (cls = 'w-6 h-6') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>`,
  wineOff: (cls = 'w-6 h-6') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8 22h8"/><path d="M7 10h3m4 0h3"/><path d="M12 15v7"/><path d="m7.3 7.3A5 5 0 0 0 12 15a5 5 0 0 0 4.7-3.3"/><path d="M17 2H9.8"/></svg>`,
  zoomIn: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,
  edit: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  thumbsUp: (cls = 'w-3 h-3') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
  thumbsDown: (cls = 'w-3 h-3') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>`,
  helpCircle: (cls = 'w-3 h-3') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  bookmark: (cls = 'w-3 h-3') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  search: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`,
  close: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  sparkles: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  heart: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  alert: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  activity: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  award: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  plus: (cls = 'w-3.5 h-3.5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  plusCircle: (cls = 'w-5 h-5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  users: (cls = 'w-5 h-5') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  checkCircle: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  info: (cls = 'w-4 h-4') => `<svg class="${cls} inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
};

// Safe array utility to prevent crashes when fields are strings or undefined
function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return trimmed.split(/[,，/、\n\r]+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Normalize and sanitize wine object to guarantee correct types across the whole app
function normalizeWine(w) {
  if (!w || typeof w !== 'object') return null;
  return {
    ...w,
    id: String(w.id || ('wine_' + Date.now())),
    name: String(w.name || '未命名酒款'),
    type: w.type || '紅酒',
    vintage: w.vintage || '',
    price: (w.price !== null && w.price !== undefined && w.price !== '') ? (Number(w.price) || null) : null,
    priceRaw: w.priceRaw || w.priceraw || '',
    priceRange: w.priceRange || w.pricerange || '',
    country: w.country || '',
    region: w.region || '',
    grapes: ensureArray(w.grapes),
    flavors: ensureArray(w.flavors),
    rawTags: ensureArray(w.rawTags || w.rawtags),
    body: w.body || '中等',
    tannin: w.tannin || '適中',
    acidity: w.acidity || '中',
    sweetness: w.sweetness || '乾型',
    rating: (w.rating !== null && w.rating !== undefined && w.rating !== '') ? Number(w.rating) : null,
    repurchase: typeof w.repurchase === 'string' ? w.repurchase : (w.repurchase ? String(w.repurchase) : '未評級'),
    notes: w.notes || '',
    image: w.image || '',
    purchasePlace: w.purchasePlace || w.purchaseplace || '',
    source: w.source || '',
    status: w.status || '已記錄',
    foodPairing: w.foodPairing || w.foodpairing || '',
    occasion: w.occasion || '',
    decantMinutes: w.decantMinutes || w.decantminutes || '',
    remark: w.remark || '',
    reviewer: w.reviewer || '品酒愛好者',
    date: w.date || '',
    createdAt: w.createdAt || w.createdat || ''
  };
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
  renderApp();
  initCloudSyncIfEnabled();
});

// Load data from LocalStorage or fallback to window.INITIAL_WINES with automatic normalization
function loadInitialData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.wines = parsed.map(normalizeWine).filter(Boolean);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wines));
        console.log(`Loaded and normalized ${state.wines.length} wines from LocalStorage.`);
        return;
      }
    } catch (e) {
      console.error('Error parsing LocalStorage data, falling back to INITIAL_WINES', e);
    }
  }

  if (window.INITIAL_WINES && Array.isArray(window.INITIAL_WINES)) {
    state.wines = window.INITIAL_WINES.map(normalizeWine).filter(Boolean);
    saveDataToLocal();
    console.log(`Initialized and normalized ${state.wines.length} wines from Notion export.`);
  } else {
    state.wines = [];
  }
}

function saveDataToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wines));
  if (state.cloudConfig.enabled) {
    pushToCloud();
  }
}

function resetFormState() {
  formSensory = {
    body: '飽滿',
    tannin: '柔和',
    acidity: '中',
    sweetness: '乾型',
    rating: 4,
    image: '',
    flavors: []
  };
}

// Global UI Tab Switching
function switchTab(tab, preserveEdit = false) {
  if (state.activeTab === tab && tab !== 'add' && !state.editingWineId) return;
  state.activeTab = tab;
  if (!preserveEdit) {
    state.editingWineId = null;
    resetFormState();
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Main Render Function with Error Boundary
function renderApp() {
  renderNavbar();
  renderBottomNav();

  const container = document.getElementById('main-content');
  if (!container) return;

  try {
    if (state.activeTab === 'cellar') {
      container.innerHTML = renderCellarView();
      attachCellarEvents();
    } else if (state.activeTab === 'add') {
      container.innerHTML = renderAddOrEditView();
      attachFormEvents();
      if (window.lucide) lucide.createIcons();
    } else if (state.activeTab === 'analytics') {
      container.innerHTML = renderAnalyticsView();
      renderAnalyticsCharts();
      attachMatcherEvents();
    } else if (state.activeTab === 'sync') {
      container.innerHTML = renderSyncView();
      attachSyncEvents();
      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    console.error('Render error:', err);
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-red-200 text-center space-y-3 my-6">
        <div class="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
          ${ICONS.alert('w-6 h-6')}
        </div>
        <h3 class="text-sm font-bold text-gray-800">頁面渲染出現小狀況</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto">${escapeHtml(err.message)}</p>
        <button onclick="localStorage.removeItem(STORAGE_KEY); location.reload();" class="px-4 py-2 bg-red-800 text-white rounded-xl text-xs font-semibold hover:bg-red-900 transition">
          修復本地快取並重新整理
        </button>
      </div>
    `;
  }
}

// Render Top Navbar
function renderNavbar() {
  const nav = document.getElementById('top-navbar');
  if (!nav) return;

  const totalCount = state.wines.length;
  const likedCount = state.wines.filter(w => w.repurchase === '可回購' || w.repurchase === '必回購').length;

  nav.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-2.5 cursor-pointer" onclick="switchTab('cellar')">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center text-white shadow-md shadow-red-900/20">
          ${ICONS.wine('w-5 h-5 text-amber-300')}
        </div>
        <div>
          <div class="flex items-center space-x-1.5">
            <h1 class="text-lg font-bold tracking-tight text-gray-900 leading-tight">品飲酒窖</h1>
            <span class="text-[10px] font-mono font-bold bg-amber-100 text-red-900 px-1.5 py-0.2 rounded border border-amber-300">v2.4 零延遲</span>
          </div>
          <p class="text-[11px] font-medium text-gray-500">已記錄 ${totalCount} 款 · ${likedCount} 款心頭好</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <button onclick="switchTab('add')" class="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95">
          ${ICONS.plus('w-3.5 h-3.5')}
          <span>記一筆</span>
        </button>
      </div>
    </div>
  `;
}

// Render Bottom Navigation Bar for Mobile
function renderBottomNav() {
  const bottomNav = document.getElementById('bottom-nav');
  if (!bottomNav) return;

  const tabs = [
    { id: 'cellar', label: '酒窖總覽', iconSvg: ICONS.wine('w-5 h-5') },
    { id: 'add', label: '記筆記', iconSvg: ICONS.plusCircle('w-5 h-5') },
    { id: 'analytics', label: '喜好分析', iconSvg: ICONS.sparkles('w-5 h-5') },
    { id: 'sync', label: '共享備份', iconSvg: ICONS.users('w-5 h-5') }
  ];

  bottomNav.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
      ${tabs.map(t => {
        const isActive = state.activeTab === t.id;
        return `
          <button onclick="switchTab('${t.id}')" class="flex flex-col items-center py-1 px-3 transition-colors ${isActive ? 'text-red-800 font-bold' : 'text-gray-400 hover:text-gray-600'}">
            <span class="${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}">${t.iconSvg}</span>
            <span class="text-[10px] mt-1">${t.label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 1: CELLAR VIEW (酒窖總覽)
// -------------------------------------------------------------
function renderCellarView() {
  // Filter and Sort Wines
  const filtered = state.wines.filter(w => {
    // Search query
    if (state.searchTerm) {
      const q = state.searchTerm.toLowerCase();
      const matchName = (w.name || '').toLowerCase().includes(q);
      const matchGrape = ensureArray(w.grapes).join(' ').toLowerCase().includes(q);
      const matchRegion = (w.region || '').toLowerCase().includes(q);
      const matchCountry = (w.country || '').toLowerCase().includes(q);
      const matchFlavors = ensureArray(w.flavors).join(' ').toLowerCase().includes(q);
      const matchStore = (w.purchasePlace || '').toLowerCase().includes(q);
      const matchNotes = (w.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchGrape && !matchRegion && !matchCountry && !matchFlavors && !matchStore && !matchNotes) {
        return false;
      }
    }

    // Type filter
    if (state.selectedType !== 'all') {
      if ((w.type || '紅酒') !== state.selectedType) return false;
    }

    // Repurchase filter
    if (state.selectedRepurchase !== 'all') {
      const rep = String(w.repurchase || '');
      if (state.selectedRepurchase === 'liked') {
        if (rep !== '可回購' && rep !== '必回購') return false;
      } else if (state.selectedRepurchase === 'consider') {
        if (!rep.includes('考慮')) return false;
      } else if (state.selectedRepurchase === 'rejected') {
        if (rep !== '不考慮') return false;
      } else if (state.selectedRepurchase === 'unrated') {
        if (rep && rep !== '未評級' && rep !== '') return false;
      }
    }

    // Rating score filter (1~5 Stars)
    if (state.selectedRatingFilter !== 'all') {
      const r = Number(w.rating) || 0;
      if (state.selectedRatingFilter === '5' && r < 5) return false;
      if (state.selectedRatingFilter === '4plus' && r < 4) return false;
      if (state.selectedRatingFilter === '3plus' && r < 3) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (state.selectedSort === 'newest') {
      return (b.id || '').localeCompare(a.id || '');
    } else if (state.selectedSort === 'rating') {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    } else if (state.selectedSort === 'price_asc') {
      return (a.price || 99999) - (b.price || 99999);
    } else if (state.selectedSort === 'price_desc') {
      return (b.price || 0) - (a.price || 0);
    }
    return 0;
  });

  const wineTypes = ['全部', '紅酒', '白酒', '氣泡酒', '加烈酒', '甜酒', '粉紅酒'];

  return `
    <div class="space-y-4 pb-24">
      <!-- Search and Filters Bar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div class="relative flex items-center">
          <span class="absolute left-3.5 text-gray-400 pointer-events-none">
            ${ICONS.search('w-4 h-4')}
          </span>
          <input 
            type="text" 
            id="cellar-search"
            placeholder="搜尋酒名、葡萄品種、風味標籤、門市..." 
            value="${escapeHtml(state.searchTerm)}"
            class="w-full pl-9.5 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
          />
          ${state.searchTerm ? `
            <button onclick="clearSearch()" class="absolute right-3 text-gray-400 hover:text-gray-600">
              ${ICONS.close('w-4 h-4')}
            </button>
          ` : ''}
        </div>

        <!-- Wine Type Pill Selectors -->
        <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          ${wineTypes.map(t => {
            const val = t === '全部' ? 'all' : t;
            const isSelected = state.selectedType === val;
            return `
              <button onclick="setTypeFilter('${val}')" class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${isSelected ? 'bg-red-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                ${t}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Repurchase status pills -->
        <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span class="text-gray-400 text-[10px] whitespace-nowrap shrink-0">回購:</span>
          <button onclick="setRepurchaseFilter('all')" class="px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${state.selectedRepurchase === 'all' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}">全部</button>
          <button onclick="setRepurchaseFilter('liked')" class="px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${state.selectedRepurchase === 'liked' ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}">👍 可回購</button>
          <button onclick="setRepurchaseFilter('consider')" class="px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${state.selectedRepurchase === 'consider' ? 'bg-amber-600 text-white' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}">🤔 考慮中</button>
          <button onclick="setRepurchaseFilter('rejected')" class="px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${state.selectedRepurchase === 'rejected' ? 'bg-rose-600 text-white' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'}">🙅 不考慮</button>
        </div>

        <!-- Star Rating Filter & Sort Row -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <div class="flex items-center space-x-1">
            <span class="text-gray-400 text-[10px] whitespace-nowrap">評分:</span>
            <button onclick="setRatingFilter('all')" class="px-1.5 py-0.5 rounded text-[11px] font-medium ${state.selectedRatingFilter === 'all' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}">全部</button>
            <button onclick="setRatingFilter('4plus')" class="px-1.5 py-0.5 rounded text-[11px] font-medium ${state.selectedRatingFilter === '4plus' ? 'bg-amber-500 text-white' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}">★ 4星以上</button>
            <button onclick="setRatingFilter('5')" class="px-1.5 py-0.5 rounded text-[11px] font-medium ${state.selectedRatingFilter === '5' ? 'bg-amber-500 text-white' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}">★ 5星滿分</button>
          </div>

          <select id="cellar-sort" onchange="setSort(this.value)" class="text-[11px] bg-transparent text-gray-500 font-medium focus:outline-none cursor-pointer pl-1">
            <option value="newest" ${state.selectedSort === 'newest' ? 'selected' : ''}>最新紀錄</option>
            <option value="rating" ${state.selectedSort === 'rating' ? 'selected' : ''}>評分最高</option>
            <option value="price_asc" ${state.selectedSort === 'price_asc' ? 'selected' : ''}>價格 (低至高)</option>
            <option value="price_desc" ${state.selectedSort === 'price_desc' ? 'selected' : ''}>價格 (高至低)</option>
          </select>
        </div>
      </div>

      <!-- Wine Cards Grid / List -->
      <div id="cellar-cards-list" class="space-y-3">
        ${filtered.length === 0 ? `
          <div class="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
              ${ICONS.wineOff('w-6 h-6')}
            </div>
            <p class="text-sm font-semibold text-gray-700">找不到符合條件的酒款</p>
            <p class="text-xs text-gray-400 mt-1">試著更換篩選條件，或點選下方「記一筆」新增！</p>
            <button onclick="resetFilters()" class="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition">
              重設所有條件
            </button>
          </div>
        ` : filtered.map(w => renderWineCard(w)).join('')}
      </div>
    </div>
  `;
}

// Single Wine Card Component with Image Thumbnail & 1-5 Star Display
function renderWineCard(wine) {
  const rep = String(wine.repurchase || '');
  const isLiked = rep === '可回購' || rep === '必回購';
  const isRejected = rep === '不考慮';
  const isConsider = rep.includes('考慮');

  let badgeColor = 'bg-gray-100 text-gray-600 border-gray-200';
  let badgeText = rep || '未評級';
  let badgeSvg = ICONS.bookmark('w-3 h-3');

  if (isLiked) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    badgeSvg = ICONS.thumbsUp('w-3 h-3');
  } else if (isRejected) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    badgeSvg = ICONS.thumbsDown('w-3 h-3');
  } else if (isConsider) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    badgeSvg = ICONS.helpCircle('w-3 h-3');
  }

  const grapes = ensureArray(wine.grapes);
  const grapeStr = grapes.join(' / ');
  const ratingNum = Number(wine.rating) || 0;
  const flavors = ensureArray(wine.flavors);

  return `
    <div class="wine-card bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 hover:border-gray-200 transition space-y-2.5">
      <!-- Card Header: Image Thumbnail + Title + Badges -->
      <div class="flex items-start gap-3">
        <!-- Bottle Thumbnail or Icon -->
        ${wine.image ? `
          <div onclick="openImageModal('${wine.id}')" class="w-14 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 cursor-pointer border border-gray-200/80 shadow-sm relative group">
            <img src="${wine.image}" alt="${escapeHtml(wine.name)}" class="w-full h-full object-cover group-hover:scale-105 transition" />
            <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
              ${ICONS.zoomIn('w-4 h-4')}
            </div>
          </div>
        ` : `
          <div class="w-12 h-16 rounded-xl bg-red-50/70 border border-red-100/60 flex items-center justify-center text-red-800/40 shrink-0">
            ${ICONS.wine('w-6 h-6')}
          </div>
        `}

        <!-- Wine Title & Meta -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${wine.type === '白酒' ? 'bg-amber-50 text-amber-800' : (wine.type === '氣泡酒' ? 'bg-sky-50 text-sky-800' : 'bg-red-50 text-red-800')}">
                ${wine.type || '紅酒'}
              </span>
              ${wine.vintage ? `<span class="text-[11px] text-gray-400 font-mono">${wine.vintage}</span>` : ''}
              ${wine.country ? `<span class="text-[10px] text-gray-500 font-medium truncate max-w-[120px]">📍 ${wine.country}</span>` : ''}
            </div>

            <!-- Repurchase Status Badge -->
            <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor} shrink-0">
              ${badgeSvg}
              <span>${badgeText}</span>
            </span>
          </div>

          <h2 class="text-sm font-bold text-gray-900 leading-snug tracking-tight mb-1 line-clamp-2">${escapeHtml(wine.name)}</h2>

          <!-- 1~5 Star Rating Score -->
          <div class="flex items-center space-x-2">
            ${ratingNum > 0 ? `
              <div class="flex items-center space-x-1 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md">
                <div class="flex text-amber-400">
                  ${[1, 2, 3, 4, 5].map(i => ICONS.star(i <= ratingNum, 'w-3 h-3')).join('')}
                </div>
                <span class="text-[11px] font-bold text-amber-800 font-mono ml-0.5">${ratingNum}.0</span>
              </div>
            ` : `
              <span class="text-[10px] text-gray-400 font-medium">尚未評分</span>
            `}

            ${grapeStr ? `
              <span class="text-[10px] text-gray-500 truncate max-w-[140px]">
                🍇 ${escapeHtml(grapeStr)}
              </span>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Sensory Scales (Body / Tannin / Acidity / Sweetness) -->
      ${(wine.body || wine.tannin || wine.acidity || wine.sweetness) ? `
        <div class="grid grid-cols-4 gap-1.5 bg-gray-50/80 rounded-xl p-2 text-center text-[10px]">
          <div>
            <span class="text-gray-400 block">酒體</span>
            <span class="font-semibold text-gray-700">${wine.body || '適中'}</span>
          </div>
          <div>
            <span class="text-gray-400 block">單寧</span>
            <span class="font-semibold text-gray-700">${wine.tannin || '適中'}</span>
          </div>
          <div>
            <span class="text-gray-400 block">酸度</span>
            <span class="font-semibold text-gray-700">${wine.acidity || '中'}</span>
          </div>
          <div>
            <span class="text-gray-400 block">甜度</span>
            <span class="font-semibold text-gray-700">${wine.sweetness || '乾型'}</span>
          </div>
        </div>
      ` : ''}

      <!-- Flavor tags -->
      ${flavors.length > 0 ? `
        <div class="flex flex-wrap gap-1">
          ${flavors.map(f => `
            <span onclick="filterByTag('${escapeHtml(f)}')" class="inline-block px-2 py-0.5 bg-gray-100 hover:bg-red-50 hover:text-red-800 text-gray-600 rounded-md text-[10px] font-medium transition cursor-pointer">
              #${escapeHtml(f)}
            </span>
          `).join('')}
        </div>
      ` : ''}

      <!-- Tasting Notes Quote -->
      ${wine.notes ? `
        <p class="text-xs text-gray-600 italic bg-amber-50/40 border-l-2 border-amber-300 pl-2.5 py-1 rounded-r leading-relaxed">
          "${escapeHtml(wine.notes)}"
        </p>
      ` : ''}

      <!-- Bottom meta info: Price, Store, Actions -->
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
        <div class="flex items-center space-x-2">
          ${wine.price ? `<span class="font-bold text-red-900 text-xs">NT$ ${wine.price}</span>` : (wine.priceRange ? `<span class="text-gray-600 font-medium">${wine.priceRange}</span>` : '')}
          ${wine.purchasePlace ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">🏪 ${escapeHtml(wine.purchasePlace)}</span>` : ''}
          ${wine.reviewer ? `<span class="text-gray-400 text-[10px]">👤 ${escapeHtml(wine.reviewer)}</span>` : ''}
        </div>

        <div class="flex items-center space-x-1">
          <button onclick="editWine('${wine.id}')" class="p-1 text-gray-400 hover:text-gray-700 rounded transition" title="編輯">
            ${ICONS.edit('w-3.5 h-3.5')}
          </button>
          <button onclick="confirmDeleteWine('${wine.id}')" class="p-1 text-gray-400 hover:text-rose-600 rounded transition" title="刪除">
            ${ICONS.trash('w-3.5 h-3.5')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 2: ADD / EDIT TASTING NOTE (新增/編輯品飲筆記)
// -------------------------------------------------------------
function renderAddOrEditView() {
  const isEditing = Boolean(state.editingWineId);
  const wine = isEditing ? (state.wines.find(w => w.id === state.editingWineId) || {}) : {
    type: '紅酒',
    body: '飽滿',
    tannin: '柔和',
    acidity: '中',
    sweetness: '乾型',
    repurchase: '可回購',
    rating: 4,
    image: '',
    flavors: [],
    grapes: [],
    reviewer: state.currentUser
  };

  const currentFlavors = formSensory.flavors || [];
  const currentRating = formSensory.rating || 4;

  return `
    <div class="max-w-xl mx-auto pb-24 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-gray-900">${isEditing ? '編輯品飲紀錄' : '記錄一瓶新酒'}</h2>
          <p class="text-xs text-gray-500">拍照、評分、標籤點選，輕鬆分析口感偏好</p>
        </div>
        ${isEditing ? `
          <button onclick="switchTab('cellar')" class="text-xs text-gray-500 hover:text-gray-800 underline">
            取消編輯
          </button>
        ` : ''}
      </div>

      <form id="wine-form" onsubmit="handleWineSubmit(event)" class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        
        <!-- 1. PHOTO UPLOAD & PREVIEW AREA -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
            <span class="flex items-center space-x-1">
              <i data-lucide="camera" class="w-3.5 h-3.5 text-red-800"></i>
              <span>酒標 / 瓶身照片 (拍照或上傳)</span>
            </span>
            <span class="text-[10px] text-gray-400 font-normal">自動壓縮以節省空間</span>
          </label>

          <!-- Hidden File Input -->
          <input 
            type="file" 
            id="form-image-input" 
            accept="image/*" 
            onchange="handleImageFileChange(event)" 
            class="sr-only"
          />

          <!-- Upload Dropzone (shown when no image) -->
          <div 
            id="image-upload-prompt" 
            onclick="triggerImageInput()"
            class="border-2 border-dashed border-gray-200 hover:border-red-700 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/50 hover:bg-red-50/20 transition ${formSensory.image ? 'hidden' : ''}"
          >
            <div class="w-10 h-10 rounded-full bg-red-100/70 text-red-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <i data-lucide="image-plus" class="w-5 h-5"></i>
            </div>
            <p class="text-xs font-bold text-gray-700">點擊拍照或上傳酒標照片</p>
            <p class="text-[10px] text-gray-400 mt-0.5">支援手機相機即拍或從相簿選取</p>
          </div>

          <!-- Preview Container (shown when image exists) -->
          <div 
            id="image-preview-container" 
            class="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-900/5 p-2 flex items-center justify-center ${formSensory.image ? '' : 'hidden'}"
          >
            <img 
              id="image-preview-img" 
              src="${formSensory.image || ''}" 
              alt="酒標預覽" 
              class="max-h-48 object-contain rounded-xl shadow-sm"
            />
            <div class="absolute top-3 right-3 flex items-center space-x-1.5">
              <button 
                type="button" 
                onclick="triggerImageInput()" 
                class="px-2.5 py-1 bg-white/90 hover:bg-white text-gray-800 text-[11px] font-semibold rounded-lg shadow transition flex items-center space-x-1"
              >
                <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                <span>更換</span>
              </button>
              <button 
                type="button" 
                onclick="removeImage()" 
                class="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] font-semibold rounded-lg shadow transition flex items-center space-x-1"
              >
                <i data-lucide="trash" class="w-3 h-3"></i>
                <span>刪除</span>
              </button>
            </div>
          </div>
        </div>

        <hr class="border-gray-100 my-2">

        <!-- 2. WINE NAME -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">酒款名稱 <span class="text-rose-500">*</span></label>
          <input 
            type="text" 
            id="form-name" 
            required
            placeholder="例如：Chateau Haut Balastard 2022 巴斯塔古堡" 
            value="${escapeHtml(wine.name || '')}"
            class="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
          />
        </div>

        <!-- 3. STAR RATING (1~5 STARS) -->
        <div class="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3.5">
          <label class="block text-xs font-bold text-gray-900 mb-1 flex items-center justify-between">
            <span class="flex items-center space-x-1">
              <i data-lucide="award" class="w-3.5 h-3.5 text-amber-600"></i>
              <span>整體評分 (1~5 分)</span>
            </span>
            <span id="rating-number-badge" class="font-mono font-bold text-sm text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">${currentRating}.0 分</span>
          </label>

          <!-- Interactive Star Buttons -->
          <div class="flex items-center justify-center space-x-3 py-1">
            ${[1, 2, 3, 4, 5].map(starVal => `
              <button 
                type="button" 
                onclick="setRating(${starVal})" 
                id="star-${starVal}" 
                class="star-btn p-1 text-gray-300 hover:text-amber-400 focus:outline-none transition"
              >
                <i data-lucide="star" class="w-7 h-7 ${starVal <= currentRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}"></i>
              </button>
            `).join('')}
          </div>

          <p id="rating-desc-text" class="text-center text-[11px] font-medium text-amber-900 mt-1">
            ${getRatingDesc(currentRating)}
          </p>
        </div>

        <!-- 4. REPURCHASE DECISION (CORE USER METRIC) -->
        <div>
          <label class="block text-xs font-bold text-gray-900 mb-2">回購意願分級 (個人喜好核心指標)</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${[
              { val: '必回購', label: '必回購 🤩', color: 'peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600' },
              { val: '可回購', label: '可回購 👍', color: 'peer-checked:bg-emerald-700 peer-checked:text-white peer-checked:border-emerald-700' },
              { val: '可考慮回購', label: '考慮中 🤔', color: 'peer-checked:bg-amber-600 peer-checked:text-white peer-checked:border-amber-600' },
              { val: '不考慮', label: '不考慮 🙅', color: 'peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600' }
            ].map(r => `
              <label class="cursor-pointer">
                <input type="radio" name="repurchase-status" value="${r.val}" ${wine.repurchase === r.val ? 'checked' : ''} class="peer sr-only">
                <div class="text-center py-2.5 px-2 text-xs rounded-xl border border-gray-200 ${r.color} transition font-bold shadow-sm">
                  ${r.label}
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <hr class="border-gray-100 my-2">

        <!-- 5. Wine Type Selection -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1.5">類型</label>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            ${['紅酒', '白酒', '氣泡酒', '加烈酒', '甜酒', '粉紅酒'].map(t => `
              <label class="cursor-pointer">
                <input type="radio" name="wine-type" value="${t}" ${wine.type === t ? 'checked' : ''} class="peer sr-only">
                <div class="text-center py-2 px-1 text-xs rounded-xl border border-gray-200 peer-checked:bg-red-800 peer-checked:text-white peer-checked:border-red-800 transition font-medium">
                  ${t}
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Vintage & Price -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">年份 (Vintage)</label>
            <input 
              type="text" 
              id="form-vintage" 
              placeholder="例如：2020 或 NV" 
              value="${escapeHtml(wine.vintage || '')}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">實付價格 (NT$)</label>
            <input 
              type="number" 
              id="form-price" 
              placeholder="例如：499" 
              value="${wine.price || ''}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
        </div>

        <!-- Country & Region -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">生產國家</label>
            <input 
              type="text" 
              id="form-country" 
              placeholder="例如：法國、義大利" 
              value="${escapeHtml(wine.country || '')}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">產區</label>
            <input 
              type="text" 
              id="form-region" 
              placeholder="例如：波爾多、勃艮第" 
              value="${escapeHtml(wine.region || '')}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
        </div>

        <!-- Grape Varieties -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">葡萄品種 (可輸入或點選加入)</label>
          <input 
            type="text" 
            id="form-grapes" 
            placeholder="例如：黑皮諾, 卡本內蘇維濃" 
            value="${escapeHtml(Array.isArray(wine.grapes) ? wine.grapes.join(', ') : (wine.grapes || ''))}"
            class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 mb-2"
          />
          <div class="flex flex-wrap gap-1.5">
            ${PRESET_GRAPES.slice(0, 8).map(g => `
              <button type="button" onclick="appendGrape('${g}')" class="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px]">
                + ${g.split('（')[0]}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Purchase Place -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">購買通路</label>
          <input 
            type="text" 
            id="form-purchase-place" 
            placeholder="例如：好市多 Costco" 
            value="${escapeHtml(wine.purchasePlace || '')}"
            class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 mb-1.5"
          />
          <div class="flex flex-wrap gap-1">
            ${PRESET_STORES.map(s => `
              <button type="button" onclick="setStore('${s}')" class="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px]">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <hr class="border-gray-100 my-4">

        <!-- Four Sensory Dimensions -->
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
            <i data-lucide="sliders" class="w-3.5 h-3.5 text-red-800"></i>
            <span>感官特徵點選</span>
          </h3>

          <!-- Body -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">酒體 (Body)</span>
            <div class="inline-flex rounded-xl bg-gray-100 p-1">
              ${['輕盈', '中等', '飽滿'].map(b => `
                <button type="button" onclick="setDim('body', '${b}')" id="btn-body-${b}" class="px-3 py-1 rounded-lg transition font-medium ${formSensory.body === b ? 'bg-red-800 text-white shadow-sm' : 'text-gray-600'}">
                  ${b}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Tannin -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">單寧 (Tannin)</span>
            <div class="inline-flex rounded-xl bg-gray-100 p-1">
              ${['柔和', '適中', '緊實'].map(t => `
                <button type="button" onclick="setDim('tannin', '${t}')" id="btn-tannin-${t}" class="px-3 py-1 rounded-lg transition font-medium ${formSensory.tannin === t ? 'bg-red-800 text-white shadow-sm' : 'text-gray-600'}">
                  ${t}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Acidity -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">酸度 (Acidity)</span>
            <div class="inline-flex rounded-xl bg-gray-100 p-1">
              ${['低', '中', '高'].map(a => `
                <button type="button" onclick="setDim('acidity', '${a}')" id="btn-acidity-${a}" class="px-3 py-1 rounded-lg transition font-medium ${formSensory.acidity === a ? 'bg-red-800 text-white shadow-sm' : 'text-gray-600'}">
                  ${a}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Sweetness -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">甜度 (Sweetness)</span>
            <div class="inline-flex rounded-xl bg-gray-100 p-1">
              ${['乾型', '微甜', '甜型'].map(s => `
                <button type="button" onclick="setDim('sweetness', '${s}')" id="btn-sweetness-${s}" class="px-3 py-1 rounded-lg transition font-medium ${formSensory.sweetness === s ? 'bg-red-800 text-white shadow-sm' : 'text-gray-600'}">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <hr class="border-gray-100 my-4">

        <!-- Flavor Wheel Tag Toggles -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-600"></i>
              <span>風味輪標籤 (點選多選)</span>
            </label>
            <span class="text-[11px] text-gray-400">已選 <span id="flavor-count" class="font-bold text-red-800">${currentFlavors.length}</span> 項</span>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-52 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
            ${PRESET_FLAVORS.map(f => {
              const isSelected = currentFlavors.includes(f.tag);
              return `
                <button 
                  type="button" 
                  onclick="toggleFlavorTag('${f.tag}')"
                  id="flavor-tag-${f.tag}"
                  class="tag-chip px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border flex items-center space-x-1.5 ${isSelected ? 'active bg-red-800 text-white border-red-800' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}"
                >
                  <span>${f.icon}</span>
                  <span class="truncate">${f.tag}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tasting Notes & Reviewer -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">品飲心得隨筆</label>
          <textarea 
            id="form-notes" 
            rows="3" 
            placeholder="例如：開瓶果香噴發，單寧細緻不咬舌，搭配牛排非常絕配！"
            class="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
          >${escapeHtml(wine.notes || '')}</textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">搭配美食</label>
            <input 
              type="text" 
              id="form-pairing" 
              placeholder="牛排、起司、海鮮..." 
              value="${escapeHtml(wine.foodPairing || '')}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">記錄人姓名</label>
            <input 
              type="text" 
              id="form-reviewer" 
              placeholder="例如：我、浩子、Alex" 
              value="${escapeHtml(wine.reviewer || state.currentUser)}"
              class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          class="w-full py-3 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white font-bold rounded-xl text-sm shadow-md shadow-red-900/20 transition active:scale-[0.99] flex items-center justify-center space-x-2"
        >
          <i data-lucide="check-circle" class="w-4 h-4"></i>
          <span>${isEditing ? '儲存變更' : '新增儲存筆記'}</span>
        </button>
      </form>
    </div>
  `;
}

// -------------------------------------------------------------
// IMAGE COMPRESSION & UPLOAD UTILS
// -------------------------------------------------------------
function triggerImageInput() {
  document.getElementById('form-image-input')?.click();
}

async function handleImageFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const compressed = await compressImage(file, 800, 0.75);
    formSensory.image = compressed;
    renderImagePreview();
  } catch (err) {
    alert('圖片壓縮與載入失敗：' + err.message);
  }
}

function removeImage() {
  formSensory.image = '';
  const input = document.getElementById('form-image-input');
  if (input) input.value = '';
  renderImagePreview();
}

function renderImagePreview() {
  const previewContainer = document.getElementById('image-preview-container');
  const uploadPrompt = document.getElementById('image-upload-prompt');
  const previewImg = document.getElementById('image-preview-img');

  if (!previewContainer || !uploadPrompt || !previewImg) return;

  if (formSensory.image) {
    previewImg.src = formSensory.image;
    previewContainer.classList.remove('hidden');
    uploadPrompt.classList.add('hidden');
  } else {
    previewImg.src = '';
    previewContainer.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
  }
}

// Canvas-based image compressor to ensure LocalStorage stays well under quota
function compressImage(file, maxDimension = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Fullscreen Image Lightbox
function openImageModal(wineId) {
  const wine = state.wines.find(w => w.id === wineId);
  if (!wine || !wine.image) return;

  let modal = document.getElementById('global-image-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-image-modal';
    document.body.appendChild(modal);
  }

  modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-opacity';
  modal.innerHTML = `
    <div class="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 text-center">
      <button onclick="closeImageModal()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition">
        ${ICONS.close('w-4 h-4')}
      </button>
      <div class="max-h-[60vh] overflow-hidden rounded-2xl mb-3 flex items-center justify-center bg-gray-50">
        <img src="${wine.image}" alt="${escapeHtml(wine.name)}" class="max-h-[60vh] object-contain rounded-xl" />
      </div>
      <h3 class="text-sm font-bold text-gray-900 leading-snug px-2">${escapeHtml(wine.name)}</h3>
      <p class="text-xs text-gray-500 mt-1">${wine.vintage || ''} ${wine.country || ''} ${wine.region ? `· ${wine.region}` : ''}</p>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) closeImageModal();
  };
}

function closeImageModal() {
  const modal = document.getElementById('global-image-modal');
  if (modal) modal.remove();
}

// -------------------------------------------------------------
// STAR RATING UTILS
// -------------------------------------------------------------
function setRating(val) {
  formSensory.rating = val;
  updateRatingUI();
}

function getRatingDesc(score) {
  const texts = {
    5: '🌟 5.0 分 · 極致驚艷 (非喝不可的頂級佳釀)',
    4: '✨ 4.0 分 · 相當優秀 (風味迷人，非常喜愛)',
    3: '👍 3.0 分 · 表現均衡 (順口日常，合格水準)',
    2: '🤔 2.0 分 · 差強人意 (略有失衡或小缺點)',
    1: '❌ 1.0 分 · 令人失望 (強烈不推，避雷酒款)'
  };
  return texts[score] || `${score} 分`;
}

function updateRatingUI() {
  const score = formSensory.rating;
  for (let i = 1; i <= 5; i++) {
    const starBtn = document.getElementById(`star-${i}`);
    if (starBtn) {
      starBtn.innerHTML = ICONS.star(i <= score, 'w-7 h-7');
    }
  }

  const badge = document.getElementById('rating-number-badge');
  if (badge) badge.innerText = `${score}.0 分`;

  const desc = document.getElementById('rating-desc-text');
  if (desc) desc.innerText = getRatingDesc(score);
}

// -------------------------------------------------------------
// TAB 3: PREFERENCE ANALYTICS & WINE MATCHER (喜好分析與選酒助手)
// -------------------------------------------------------------
function renderAnalyticsView() {
  const analysis = calculatePreferenceInsights();

  return `
    <div class="space-y-4 pb-24 max-w-xl mx-auto">
      <!-- Header Banner -->
      <div class="bg-gradient-to-br from-red-900 via-red-800 to-red-950 rounded-2xl p-5 text-white shadow-md">
        <div class="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
          ${ICONS.sparkles('w-4 h-4')}
          <span>AI 風味指紋分析</span>
        </div>
        <h2 class="text-xl font-bold tracking-tight mb-1">你的專屬品飲密碼</h2>
        <p class="text-xs text-red-200 leading-relaxed">
          基於目前 ${analysis.totalCount} 款品飲歷史（${analysis.likedCount} 款回購、${analysis.rejectedCount} 款避雷，平均評分 ${analysis.avgRating}★）運算出的個人偏好輪廓。
        </p>
      </div>

      <!-- Quick Highlights Card -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5">
          <div class="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs mb-1.5">
            ${ICONS.heart('w-3.5 h-3.5 text-emerald-600')}
            <span>命定風味關鍵字</span>
          </div>
          <div class="space-y-1">
            ${analysis.topFlavors.slice(0, 3).map(f => `
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-emerald-950">#${f.tag}</span>
                <span class="text-[10px] text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">${f.likedCount}次回購</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5">
          <div class="flex items-center space-x-1.5 text-rose-800 font-bold text-xs mb-1.5">
            ${ICONS.alert('w-3.5 h-3.5 text-rose-600')}
            <span>可能避雷特徵</span>
          </div>
          <div class="space-y-1">
            ${analysis.avoidFlavors.slice(0, 3).map(f => `
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-rose-950">#${f.tag}</span>
                <span class="text-[10px] text-rose-700 bg-rose-100/60 px-1.5 py-0.2 rounded">${f.rejectedCount}次踩雷</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Radar Chart: Sensory Profile -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
            ${ICONS.activity('w-3.5 h-3.5 text-red-800')}
            <span>回購酒款感官雷達圖</span>
          </h3>
          <span class="text-[10px] text-gray-400">綠色=最愛紅酒特徵</span>
        </div>
        <div class="h-60 flex items-center justify-center">
          <canvas id="tasteRadarChart"></canvas>
        </div>
        <p class="text-[11px] text-gray-500 text-center mt-2">
          數據顯示：您最享受「<span class="font-bold text-red-800">${analysis.dominantBody}酒體</span>」搭配「<span class="font-bold text-red-800">${analysis.dominantTannin}單寧</span>」，對高酸接受度相對較保守。
        </p>
      </div>

      <!-- Top Grape Varieties & Regions -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h3 class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
          ${ICONS.award('w-3.5 h-3.5 text-amber-600')}
          <span>最愛葡萄品種與勝率榜</span>
        </h3>

        <div class="space-y-2">
          ${analysis.grapeStats.slice(0, 5).map((g, idx) => `
            <div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-semibold text-gray-800">${idx + 1}. ${g.name}</span>
                <span class="text-[11px] font-mono text-emerald-700 font-bold">${g.winRate}% 回購 (${g.liked}/${g.total})</span>
              </div>
              <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-red-800 to-emerald-600 rounded-full" style="width: ${g.winRate}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Realtime Wine Matcher Tool (站在酒架前的選酒小幫手) -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-red-100 ring-1 ring-red-800/10 space-y-3">
        <div class="flex items-center space-x-2">
          <div class="w-7 h-7 rounded-lg bg-red-800 flex items-center justify-center text-white text-xs font-bold">
            🎯
          </div>
          <div>
            <h3 class="text-xs font-bold text-gray-900">賣場現場選酒評估器 (Wine Matcher)</h3>
            <p class="text-[11px] text-gray-500">站在酒架前勾選特徵，預測契合度</p>
          </div>
        </div>

        <div class="space-y-2.5 pt-1">
          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1">輸入葡萄品種或產區</label>
            <input 
              type="text" 
              id="matcher-grape" 
              oninput="runMatcherEvaluation()"
              placeholder="例如：黑皮諾、波爾多、馬爾貝克" 
              class="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-800"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-600 mb-1">勾選該酒特色標籤 (可複選)</label>
            <div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 border border-gray-100 rounded-lg bg-gray-50/50">
              ${PRESET_FLAVORS.map(f => `
                <button 
                  type="button" 
                  onclick="toggleMatcherFlavor('${f.tag}')"
                  id="matcher-tag-${f.tag}"
                  class="px-2 py-1 rounded text-[10px] font-medium border bg-white border-gray-200 text-gray-700 transition"
                >
                  ${f.icon} ${f.tag}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Evaluation Output Box -->
          <div id="matcher-result-box" class="bg-gray-50 rounded-xl p-3 border border-gray-200 mt-2 text-center">
            <div class="text-2xl font-black text-red-900" id="matcher-score">-- %</div>
            <div class="text-xs font-bold text-gray-700 mt-0.5" id="matcher-verdict">請輸入特徵進行契合度運算</div>
            <div class="text-[11px] text-gray-500 mt-1 leading-normal" id="matcher-reason"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 4: MULTI-USER SHARING & SYNC (多人共享與備份)
// -------------------------------------------------------------
function renderSyncView() {
  const isCloudActive = state.cloudConfig && state.cloudConfig.enabled;

  return `
    <div class="space-y-4 pb-24 max-w-xl mx-auto">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-2">
        <div class="flex items-center space-x-2 text-red-800 font-bold text-sm">
          <i data-lucide="users" class="w-4 h-4"></i>
          <span>多人共享與即時協作</span>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed">
          您希望朋友拿到網址就能即時查看與記錄品飲筆記。以下提供兩種最簡單靈活的共享方式：
        </p>
      </div>

      <!-- Cloud Option: Supabase Realtime (Serverless & Free) -->
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full ${isCloudActive ? 'bg-emerald-500 sync-live' : 'bg-gray-300'}"></span>
            <h3 class="text-xs font-bold text-gray-900">免費雲端即時同步 (Supabase)</h3>
          </div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${isCloudActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}">
            ${isCloudActive ? '同步連線中' : '尚未啟用'}
          </span>
        </div>

        <p class="text-xs text-gray-500 leading-relaxed">
          零伺服器維護成本！只需免費建立一個 Supabase 資料庫，朋友在外面用手機打開網址，就能多人即時同步資料。
        </p>

        <div class="space-y-2.5 pt-1">
          <div>
            <label class="block text-[11px] font-semibold text-gray-700 mb-1">Supabase Project URL</label>
            <input 
              type="text" 
              id="cloud-url" 
              placeholder="https://your-project.supabase.co" 
              value="${escapeHtml(state.cloudConfig.supabaseUrl || '')}"
              class="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-800"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-gray-700 mb-1">Supabase Anon Key</label>
            <input 
              type="password" 
              id="cloud-key" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value="${escapeHtml(state.cloudConfig.supabaseKey || '')}"
              class="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-800"
            />
          </div>

          <div class="flex items-center space-x-2 pt-1">
            <button 
              onclick="saveCloudConfig(true)" 
              class="flex-1 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              啟用雲端即時同步
            </button>
            ${isCloudActive ? `
              <button 
                onclick="saveCloudConfig(false)" 
                class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                中斷同步
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Backup & Restore Actions -->
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
          <i data-lucide="download-cloud" class="w-3.5 h-3.5 text-gray-700"></i>
          <span>本機備份與檔案匯出 (永久自主掌控)</span>
        </h3>
        <p class="text-xs text-gray-500">
          資料儲存在您的瀏覽器中，您可以隨時一鍵備份，絕不受限於任何單一平台。
        </p>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <button 
            onclick="exportToJson()" 
            class="flex items-center justify-center space-x-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition"
          >
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
            <span>匯出 JSON 備份檔</span>
          </button>

          <button 
            onclick="exportToCsv()" 
            class="flex items-center justify-center space-x-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition"
          >
            <i data-lucide="sheet" class="w-3.5 h-3.5"></i>
            <span>匯出 CSV 試算表</span>
          </button>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
          <label class="cursor-pointer inline-flex items-center space-x-1 text-xs text-red-800 font-semibold hover:underline">
            <i data-lucide="upload" class="w-3.5 h-3.5"></i>
            <span>匯入歷史 JSON 檔案</span>
            <input type="file" accept=".json" onchange="importFromJson(event)" class="sr-only">
          </label>

          <button onclick="resetToInitialDataset()" class="text-xs text-gray-400 hover:text-rose-600">
            重設回 Notion 原裝紀錄
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// ANALYTICS CALCULATION LOGIC
// -------------------------------------------------------------
function calculatePreferenceInsights() {
  const totalCount = state.wines.length;
  const likedWines = state.wines.filter(w => w.repurchase === '可回購' || w.repurchase === '必回購');
  const rejectedWines = state.wines.filter(w => w.repurchase === '不考慮');

  // Compute average rating
  const ratedWines = state.wines.filter(w => Number(w.rating) > 0);
  const avgRating = ratedWines.length > 0 
    ? (ratedWines.reduce((sum, w) => sum + Number(w.rating), 0) / ratedWines.length).toFixed(1)
    : '4.0';

  // Count flavors in liked vs rejected
  const flavorStats = {};
  state.wines.forEach(w => {
    const isLiked = w.repurchase === '可回購' || w.repurchase === '必回購';
    const isRejected = w.repurchase === '不考慮';

    ensureArray(w.flavors).forEach(f => {
      const tag = String(f || '').trim();
      if (!tag) return;
      if (!flavorStats[tag]) {
        flavorStats[tag] = { tag, likedCount: 0, rejectedCount: 0, total: 0 };
      }
      flavorStats[tag].total++;
      if (isLiked) flavorStats[tag].likedCount++;
      if (isRejected) flavorStats[tag].rejectedCount++;
    });
  });

  const topFlavors = Object.values(flavorStats)
    .filter(f => f.likedCount > 0)
    .sort((a, b) => b.likedCount - a.likedCount);

  const avoidFlavors = Object.values(flavorStats)
    .filter(f => f.rejectedCount > 0)
    .sort((a, b) => b.rejectedCount - a.rejectedCount);

  // Grape varieties stats
  const grapeMap = {};
  state.wines.forEach(w => {
    const isLiked = w.repurchase === '可回購' || w.repurchase === '必回購';
    ensureArray(w.grapes).forEach(g => {
      const name = String(g || '').split('（')[0].trim();
      if (!name) return;
      if (!grapeMap[name]) {
        grapeMap[name] = { name, liked: 0, total: 0 };
      }
      grapeMap[name].total++;
      if (isLiked) grapeMap[name].liked++;
    });
  });

  const grapeStats = Object.values(grapeMap)
    .filter(g => g.total >= 1)
    .map(g => ({
      ...g,
      winRate: Math.round((g.liked / g.total) * 100)
    }))
    .sort((a, b) => (b.winRate - a.winRate) || (b.total - a.total));

  // Dominant Sensory Dimensions
  const bodyCounts = { '輕盈': 0, '中等': 0, '飽滿': 0 };
  const tanninCounts = { '柔和': 0, '適中': 0, '緊實': 0 };
  likedWines.forEach(w => {
    if (w.body && bodyCounts[w.body] !== undefined) bodyCounts[w.body]++;
    if (w.tannin && tanninCounts[w.tannin] !== undefined) tanninCounts[w.tannin]++;
  });

  const dominantBody = Object.keys(bodyCounts).reduce((a, b) => bodyCounts[a] >= bodyCounts[b] ? a : b, '飽滿');
  const dominantTannin = Object.keys(tanninCounts).reduce((a, b) => tanninCounts[a] >= tanninCounts[b] ? a : b, '柔和');

  return {
    totalCount,
    likedCount: likedWines.length,
    rejectedCount: rejectedWines.length,
    avgRating,
    topFlavors,
    avoidFlavors,
    grapeStats,
    dominantBody,
    dominantTannin
  };
}

let tasteChartInstance = null;

// Render Radar Chart with Chart.js
function renderAnalyticsCharts() {
  const canvas = document.getElementById('tasteRadarChart');
  if (!canvas || !window.Chart) return;

  if (tasteChartInstance) {
    try {
      tasteChartInstance.destroy();
    } catch (e) {}
    tasteChartInstance = null;
  }

  const likedWines = state.wines.filter(w => w.repurchase === '可回購' || w.repurchase === '必回購');

  let bodyScore = 0, tanninScore = 0, acidityScore = 0, fruitScore = 0, oakScore = 0;
  let count = likedWines.length || 1;

  likedWines.forEach(w => {
    if (w.body === '飽滿') bodyScore += 5;
    else if (w.body === '中等') bodyScore += 3.5;
    else bodyScore += 2;

    if (w.tannin === '柔和') tanninScore += 4.5;
    else if (w.tannin === '適中') tanninScore += 3.5;
    else tanninScore += 2.5;

    if (w.acidity === '低') acidityScore += 4.5;
    else if (w.acidity === '中') acidityScore += 3.5;
    else acidityScore += 2;

    const hasFruit = ensureArray(w.flavors).some(f => String(f).includes('水果') || String(f).includes('果香'));
    fruitScore += hasFruit ? 4.8 : 3.0;

    const hasOak = ensureArray(w.flavors).some(f => String(f).includes('橡木') || String(f).includes('香草'));
    oakScore += hasOak ? 4.5 : 2.8;
  });

  const radarData = [
    Number((bodyScore / count).toFixed(1)),
    Number((tanninScore / count).toFixed(1)),
    Number((acidityScore / count).toFixed(1)),
    Number((fruitScore / count).toFixed(1)),
    Number((oakScore / count).toFixed(1))
  ];

  tasteChartInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['酒體飽滿度', '單寧柔順感', '酸度溫和度', '果香濃郁度', '橡木桶陳度'],
      datasets: [{
        label: '個人回購喜好輪廓',
        data: radarData,
        fill: true,
        backgroundColor: 'rgba(114, 47, 55, 0.2)',
        borderColor: '#722F37',
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#722F37'
      }]
    },
    options: {
      animation: {
        duration: 300
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, display: false },
          pointLabels: {
            font: { size: 11, weight: 'bold' },
            color: '#4B5563'
          },
          grid: { color: 'rgba(0, 0, 0, 0.06)' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Real-time Wine Matcher Evaluation Engine
function toggleMatcherFlavor(tag) {
  const idx = state.matcherInput.selectedFlavors.indexOf(tag);
  const btn = document.getElementById(`matcher-tag-${tag}`);
  if (idx > -1) {
    state.matcherInput.selectedFlavors.splice(idx, 1);
    if (btn) btn.className = 'px-2 py-1 rounded text-[10px] font-medium border bg-white border-gray-200 text-gray-700 transition';
  } else {
    state.matcherInput.selectedFlavors.push(tag);
    if (btn) btn.className = 'px-2 py-1 rounded text-[10px] font-medium border bg-red-800 text-white border-red-800 transition shadow-sm';
  }
  runMatcherEvaluation();
}

function runMatcherEvaluation() {
  const grapeInput = (document.getElementById('matcher-grape')?.value || '').toLowerCase().trim();
  const selectedFlavors = state.matcherInput.selectedFlavors;

  const scoreEl = document.getElementById('matcher-score');
  const verdictEl = document.getElementById('matcher-verdict');
  const reasonEl = document.getElementById('matcher-reason');

  if (!scoreEl || !verdictEl || !reasonEl) return;

  if (!grapeInput && selectedFlavors.length === 0) {
    scoreEl.innerText = '-- %';
    verdictEl.innerText = '請輸入品種或勾選特徵進行評估';
    reasonEl.innerText = '';
    return;
  }

  const analysis = calculatePreferenceInsights();
  let baseScore = 60;
  let pros = [];
  let cons = [];

  selectedFlavors.forEach(f => {
    const isTop = analysis.topFlavors.some(t => t.tag === f);
    const isAvoid = analysis.avoidFlavors.some(a => a.tag === f);

    if (isTop) {
      baseScore += 12;
      pros.push(`命中您最愛風味 #${f}`);
    } else if (isAvoid) {
      baseScore -= 20;
      cons.push(`注意：含有您曾排斥的特徵 #${f}`);
    } else {
      baseScore += 3;
    }
  });

  if (grapeInput) {
    const matchedGrape = analysis.grapeStats.find(g => grapeInput.includes(g.name.toLowerCase()));
    if (matchedGrape) {
      if (matchedGrape.winRate >= 70) {
        baseScore += 18;
        pros.push(`葡萄品種「${matchedGrape.name}」在您的回購歷史中勝率高達 ${matchedGrape.winRate}%`);
      } else if (matchedGrape.winRate < 40) {
        baseScore -= 15;
        cons.push(`「${matchedGrape.name}」在您過去的滿意度較低 (${matchedGrape.winRate}%)`);
      }
    }
  }

  const finalScore = Math.max(10, Math.min(98, baseScore));
  scoreEl.innerText = `${finalScore}%`;

  if (finalScore >= 80) {
    scoreEl.className = 'text-2xl font-black text-emerald-600';
    verdictEl.innerText = '高度契合！極推薦入手嘗試 🍷';
  } else if (finalScore >= 60) {
    scoreEl.className = 'text-2xl font-black text-amber-600';
    verdictEl.innerText = '口感符合日常風格，值得一試 👍';
  } else {
    scoreEl.className = 'text-2xl font-black text-rose-600';
    verdictEl.innerText = '可能偏離您的偏好或有避雷特徵 ⚠️';
  }

  reasonEl.innerHTML = `
    ${pros.length > 0 ? `<p class="text-emerald-700">✨ ${pros.join('；')}</p>` : ''}
    ${cons.length > 0 ? `<p class="text-rose-700 mt-0.5">⚠️ ${cons.join('；')}</p>` : ''}
  `;
}

// -------------------------------------------------------------
// FORM SUBMIT & EDIT HANDLERS
// -------------------------------------------------------------
function setDim(dimension, value) {
  formSensory[dimension] = value;
  ['輕盈', '中等', '飽滿', '柔和', '適中', '緊實', '低', '中', '高', '乾型', '微甜', '甜型'].forEach(v => {
    const btn = document.getElementById(`btn-${dimension}-${v}`);
    if (btn) {
      if (v === value) {
        btn.className = 'px-3 py-1 rounded-lg transition font-medium bg-red-800 text-white shadow-sm';
      } else {
        btn.className = 'px-3 py-1 rounded-lg transition font-medium text-gray-600';
      }
    }
  });
}

function toggleFlavorTag(tag) {
  const idx = formSensory.flavors.indexOf(tag);
  const btn = document.getElementById(`flavor-tag-${tag}`);
  if (idx > -1) {
    formSensory.flavors.splice(idx, 1);
    if (btn) btn.className = 'tag-chip px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border bg-white text-gray-700 border-gray-200 hover:bg-gray-100';
  } else {
    formSensory.flavors.push(tag);
    if (btn) btn.className = 'tag-chip px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border active bg-red-800 text-white border-red-800 shadow-sm';
  }

  const countEl = document.getElementById('flavor-count');
  if (countEl) countEl.innerText = formSensory.flavors.length;
}

function appendGrape(grape) {
  const input = document.getElementById('form-grapes');
  if (!input) return;
  const current = input.value.split(',').map(s => s.trim()).filter(Boolean);
  if (!current.includes(grape)) {
    current.push(grape);
    input.value = current.join(', ');
  }
}

function setStore(store) {
  const input = document.getElementById('form-purchase-place');
  if (input) input.value = store;
}

function handleWineSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('form-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    alert('請輸入酒名！');
    return;
  }

  const selectedTypeRadio = document.querySelector('input[name="wine-type"]:checked');
  const type = selectedTypeRadio ? selectedTypeRadio.value : '紅酒';

  const selectedRepurchaseRadio = document.querySelector('input[name="repurchase-status"]:checked');
  const repurchase = selectedRepurchaseRadio ? selectedRepurchaseRadio.value : '可回購';

  const vintage = document.getElementById('form-vintage')?.value.trim() || '';
  const priceVal = document.getElementById('form-price')?.value.trim();
  const price = priceVal ? parseInt(priceVal, 10) : null;
  const country = document.getElementById('form-country')?.value.trim() || '';
  const region = document.getElementById('form-region')?.value.trim() || '';
  const grapesStr = document.getElementById('form-grapes')?.value.trim() || '';
  const grapes = grapesStr.split(',').map(s => s.trim()).filter(Boolean);
  const purchasePlace = document.getElementById('form-purchase-place')?.value.trim() || '';
  const notes = document.getElementById('form-notes')?.value.trim() || '';
  const foodPairing = document.getElementById('form-pairing')?.value.trim() || '';
  const reviewer = document.getElementById('form-reviewer')?.value.trim() || state.currentUser;

  // Save reviewer name
  if (reviewer) {
    state.currentUser = reviewer;
    localStorage.setItem(USERNAME_KEY, reviewer);
  }

  const isEditing = Boolean(state.editingWineId);
  const editingId = state.editingWineId;
  let targetWine = null;

  if (isEditing) {
    // Update existing
    const idx = state.wines.findIndex(w => w.id === editingId);
    if (idx > -1) {
      state.wines[idx] = {
        ...state.wines[idx],
        name,
        type,
        vintage,
        price,
        country,
        region,
        grapes,
        purchasePlace,
        notes,
        foodPairing,
        reviewer,
        repurchase,
        rating: formSensory.rating,
        image: formSensory.image || state.wines[idx].image || '',
        body: formSensory.body,
        tannin: formSensory.tannin,
        acidity: formSensory.acidity,
        sweetness: formSensory.sweetness,
        flavors: [...formSensory.flavors]
      };
      targetWine = state.wines[idx];
    }
  } else {
    // Create new
    const newWine = {
      id: `wine_${Date.now()}`,
      name,
      type,
      vintage,
      price,
      country,
      region,
      grapes,
      purchasePlace,
      notes,
      foodPairing,
      reviewer,
      repurchase,
      rating: formSensory.rating,
      image: formSensory.image || '',
      body: formSensory.body,
      tannin: formSensory.tannin,
      acidity: formSensory.acidity,
      sweetness: formSensory.sweetness,
      flavors: [...formSensory.flavors],
      createdAt: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    state.wines.unshift(newWine);
    targetWine = newWine;
  }

  // Save to LocalStorage & Supabase
  saveDataToLocal();
  if (targetWine) {
    pushToCloud(targetWine);
  }

  // Completely reset editing state and form state
  state.editingWineId = null;
  resetFormState();

  // Explicitly clear DOM form if present
  const formEl = document.getElementById('wine-form');
  if (formEl) {
    formEl.reset();
  }
  renderImagePreview();

  // Show clear and distinct toast notification
  if (isEditing) {
    showToast(`✨ 修改完成！「${name}」品飲筆記已成功更新！`, 'success');
  } else {
    showToast(`🎉 儲存完成！「${name}」已成功記錄至酒窖！`, 'success');
  }

  // Switch to cellar view and smoothly scroll to top
  switchTab('cellar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editWine(id) {
  const wine = state.wines.find(w => w.id === id);
  if (!wine) return;

  state.editingWineId = id;
  formSensory = {
    body: wine.body || '飽滿',
    tannin: wine.tannin || '適中',
    acidity: wine.acidity || '中',
    sweetness: wine.sweetness || '乾型',
    rating: Number(wine.rating) || 4,
    image: wine.image || '',
    flavors: ensureArray(wine.flavors)
  };

  switchTab('add', true);
}

function confirmDeleteWine(id) {
  const wine = state.wines.find(w => w.id === id);
  if (!wine) return;
  if (confirm(`確定要刪除「${wine.name}」這筆紀錄嗎？`)) {
    const deletedName = wine.name;
    state.wines = state.wines.filter(w => w.id !== id);
    saveDataToLocal();
    deleteFromCloud(id);
    renderApp();
    showToast(`🗑️ 已成功刪除「${deletedName}」`, 'info');
  }
}

// -------------------------------------------------------------
// FILTER & SEARCH ACTIONS
// -------------------------------------------------------------
function setTypeFilter(type) {
  state.selectedType = type;
  renderApp();
}

function setRepurchaseFilter(status) {
  state.selectedRepurchase = status;
  renderApp();
}

function setRatingFilter(ratingFilter) {
  state.selectedRatingFilter = ratingFilter;
  renderApp();
}

function setSort(sortVal) {
  state.selectedSort = sortVal;
  renderApp();
}

function filterByTag(tag) {
  state.activeTab = 'cellar';
  state.searchTerm = tag;
  state.selectedType = 'all';
  state.selectedRepurchase = 'all';
  renderApp();
}

function clearSearch() {
  state.searchTerm = '';
  renderApp();
}

function resetFilters() {
  state.searchTerm = '';
  state.selectedType = 'all';
  state.selectedRepurchase = 'all';
  state.selectedRatingFilter = 'all';
  state.selectedSort = 'newest';
  renderApp();
}

// -------------------------------------------------------------
// EXPORT & IMPORT ACTIONS
// -------------------------------------------------------------
function exportToJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.wines, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `wine_journal_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function exportToCsv() {
  const headers = ['酒名', '酒類', '年份', '價格', '評分', '回購分級', '國家', '產區', '葡萄品種', '酒體', '單寧', '酸度', '甜度', '風味標籤', '購買地', '品飲心得', '記錄人'];
  const rows = state.wines.map(w => [
    `"${(w.name || '').replace(/"/g, '""')}"`,
    `"${(w.type || '').replace(/"/g, '""')}"`,
    `"${w.vintage || ''}"`,
    w.price || '',
    w.rating || '',
    `"${(w.repurchase || '').replace(/"/g, '""')}"`,
    `"${(w.country || '').replace(/"/g, '""')}"`,
    `"${(w.region || '').replace(/"/g, '""')}"`,
    `"${(Array.isArray(w.grapes) ? w.grapes.join(' / ') : (w.grapes || '')).replace(/"/g, '""')}"`,
    `"${w.body || ''}"`,
    `"${w.tannin || ''}"`,
    `"${w.acidity || ''}"`,
    `"${w.sweetness || ''}"`,
    `"${(Array.isArray(w.flavors) ? w.flavors.join(', ') : (w.flavors || '')).replace(/"/g, '""')}"`,
    `"${(w.purchasePlace || '').replace(/"/g, '""')}"`,
    `"${(w.notes || '').replace(/"/g, '""')}"`,
    `"${(w.reviewer || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `wine_tasting_notes_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function importFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        state.wines = imported;
        saveDataToLocal();
        alert(`成功匯入 ${imported.length} 筆品飲紀錄！`);
        switchTab('cellar');
      } else {
        alert('檔案格式錯誤：需為 JSON 陣列');
      }
    } catch (err) {
      alert('無法解析 JSON 檔案：' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetToInitialDataset() {
  if (confirm('確定要重設為初始的 51 筆 Notion 歷史紀錄嗎？')) {
    if (window.INITIAL_WINES) {
      state.wines = JSON.parse(JSON.stringify(window.INITIAL_WINES));
      saveDataToLocal();
      renderApp();
      alert('已重設為原始 Notion 品飲紀錄！');
    }
  }
}

// -------------------------------------------------------------
// CLOUD SYNC PROVIDER (SUPABASE / REST API)
// -------------------------------------------------------------
function saveCloudConfig(enable) {
  const url = document.getElementById('cloud-url')?.value.trim() || '';
  const key = document.getElementById('cloud-key')?.value.trim() || '';

  if (enable && (!url || !key)) {
    alert('請填寫完整的 Supabase URL 與 Anon Key');
    return;
  }

  state.cloudConfig = {
    enabled: enable,
    supabaseUrl: url,
    supabaseKey: key
  };

  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(state.cloudConfig));
  if (enable) {
    pullFromCloud();
  }
  renderApp();
}

async function initCloudSyncIfEnabled() {
  if (state.cloudConfig && state.cloudConfig.enabled) {
    await pullFromCloud();
  }
}

async function pullFromCloud() {
  if (!state.cloudConfig.enabled || !state.cloudConfig.supabaseUrl) return;
  try {
    const res = await fetch(`${state.cloudConfig.supabaseUrl}/rest/v1/wines?select=*&order=createdat.desc`, {
      headers: {
        'apikey': state.cloudConfig.supabaseKey,
        'Authorization': `Bearer ${state.cloudConfig.supabaseKey}`
      }
    });
    if (res.ok) {
      const cloudWines = await res.json();
      if (Array.isArray(cloudWines) && cloudWines.length > 0) {
        const mapped = cloudWines.map(normalizeWine).filter(Boolean);

        const localFingerprint = state.wines.map(w => `${w.id}:${w.rating}:${w.repurchase}`).join(',');
        const cloudFingerprint = mapped.map(w => `${w.id}:${w.rating}:${w.repurchase}`).join(',');

        state.wines = mapped;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wines));

        if (localFingerprint !== cloudFingerprint) {
          renderApp();
          console.log('Successfully pulled updates from cloud database:', state.wines.length);
        } else {
          console.log('Cloud data matches local cache. Skipped redundant DOM redraw.');
        }
      }
    }
  } catch (err) {
    console.warn('Cloud sync pull warning:', err);
  }
}

async function pushToCloud(singleWine) {
  if (!state.cloudConfig.enabled || !state.cloudConfig.supabaseUrl) return;
  try {
    const list = singleWine ? [singleWine] : state.wines;
    const payload = list.map(w => ({
      id: w.id,
      name: w.name,
      type: w.type || '紅酒',
      vintage: w.vintage || '',
      price: w.price,
      priceraw: w.priceRaw || '',
      pricerange: w.priceRange || '',
      country: w.country || '',
      region: w.region || '',
      grapes: Array.isArray(w.grapes) ? w.grapes : [],
      flavors: Array.isArray(w.flavors) ? w.flavors : [],
      rawtags: Array.isArray(w.rawTags) ? w.rawTags : [],
      body: w.body || '中等',
      tannin: w.tannin || '適中',
      acidity: w.acidity || '中',
      sweetness: w.sweetness || '乾型',
      rating: Number(w.rating) || 4,
      repurchase: w.repurchase || '可回購',
      notes: w.notes || '',
      image: w.image || '',
      purchaseplace: w.purchasePlace || '',
      source: w.source || '',
      status: w.status || '已記錄',
      foodpairing: w.foodPairing || '',
      occasion: w.occasion || '',
      decantminutes: w.decantMinutes || '',
      remark: w.remark || '',
      reviewer: w.reviewer || '品酒愛好者',
      date: w.date || '',
      createdat: w.createdAt || ''
    }));

    await fetch(`${state.cloudConfig.supabaseUrl}/rest/v1/wines`, {
      method: 'POST',
      headers: {
        'apikey': state.cloudConfig.supabaseKey,
        'Authorization': `Bearer ${state.cloudConfig.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    console.log('Successfully pushed to Supabase cloud!');
  } catch (err) {
    console.warn('Cloud sync push warning:', err);
  }
}

async function deleteFromCloud(wineId) {
  if (!state.cloudConfig.enabled || !state.cloudConfig.supabaseUrl) return;
  try {
    await fetch(`${state.cloudConfig.supabaseUrl}/rest/v1/wines?id=eq.${wineId}`, {
      method: 'DELETE',
      headers: {
        'apikey': state.cloudConfig.supabaseKey,
        'Authorization': `Bearer ${state.cloudConfig.supabaseKey}`
      }
    });
    console.log('Successfully deleted wine from cloud:', wineId);
  } catch (err) {
    console.warn('Delete cloud warning:', err);
  }
}

// -------------------------------------------------------------
// EVENT LISTENERS & HELPERS
// -------------------------------------------------------------
function attachCellarEvents() {
  const searchInput = document.getElementById('cellar-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value;
      updateCellarCardsListOnly();
    });
  }
}

function updateCellarCardsListOnly() {
  const listEl = document.getElementById('cellar-cards-list');
  if (!listEl) {
    const container = document.getElementById('main-content');
    if (container) container.innerHTML = renderCellarView();
    attachCellarEvents();
    return;
  }

  const filtered = state.wines.filter(w => {
    if (state.searchTerm) {
      const q = state.searchTerm.toLowerCase();
      const matchName = (w.name || '').toLowerCase().includes(q);
      const matchGrape = ensureArray(w.grapes).join(' ').toLowerCase().includes(q);
      const matchRegion = (w.region || '').toLowerCase().includes(q);
      const matchCountry = (w.country || '').toLowerCase().includes(q);
      const matchFlavors = ensureArray(w.flavors).join(' ').toLowerCase().includes(q);
      const matchStore = (w.purchasePlace || '').toLowerCase().includes(q);
      const matchNotes = (w.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchGrape && !matchRegion && !matchCountry && !matchFlavors && !matchStore && !matchNotes) {
        return false;
      }
    }
    if (state.selectedType !== 'all') {
      if ((w.type || '紅酒') !== state.selectedType) return false;
    }
    if (state.selectedRepurchase !== 'all') {
      const rep = String(w.repurchase || '');
      if (state.selectedRepurchase === 'liked') {
        if (rep !== '可回購' && rep !== '必回購') return false;
      } else if (state.selectedRepurchase === 'consider') {
        if (!rep.includes('考慮')) return false;
      } else if (state.selectedRepurchase === 'rejected') {
        if (rep !== '不考慮') return false;
      } else if (state.selectedRepurchase === 'unrated') {
        if (rep && rep !== '未評級' && rep !== '') return false;
      }
    }
    if (state.selectedRatingFilter !== 'all') {
      const r = Number(w.rating) || 0;
      if (state.selectedRatingFilter === '5' && r < 5) return false;
      if (state.selectedRatingFilter === '4plus' && r < 4) return false;
      if (state.selectedRatingFilter === '3plus' && r < 3) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (state.selectedSort === 'newest') {
      return (b.id || '').localeCompare(a.id || '');
    } else if (state.selectedSort === 'rating') {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    } else if (state.selectedSort === 'price_asc') {
      return (a.price || 99999) - (b.price || 99999);
    } else if (state.selectedSort === 'price_desc') {
      return (b.price || 0) - (a.price || 0);
    }
    return 0;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
          ${ICONS.wineOff('w-6 h-6')}
        </div>
        <p class="text-sm font-semibold text-gray-700">找不到符合條件的酒款</p>
        <p class="text-xs text-gray-400 mt-1">試著更換篩選條件，或點選下方「記一筆」新增！</p>
        <button onclick="resetFilters()" class="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition">
          重設所有條件
        </button>
      </div>
    `;
  } else {
    listEl.innerHTML = filtered.map(w => renderWineCard(w)).join('');
  }
}

function attachFormEvents() {
  if (state.editingWineId) {
    const wine = state.wines.find(w => w.id === state.editingWineId);
    if (wine) {
      setDim('body', wine.body || '飽滿');
      setDim('tannin', wine.tannin || '適中');
      setDim('acidity', wine.acidity || '中');
      setDim('sweetness', wine.sweetness || '乾型');
      setRating(Number(wine.rating) || 4);
    }
  }
}

function attachMatcherEvents() {
  runMatcherEvaluation();
}

function attachSyncEvents() {}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Floating Toast Notification
function showToast(message, type = 'success') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }

  const isSuccess = type === 'success';
  const bgColor = isSuccess 
    ? 'bg-emerald-900 text-white border-2 border-emerald-400 shadow-2xl shadow-emerald-950/60 ring-4 ring-emerald-500/20' 
    : 'bg-gray-900 text-white border-2 border-amber-400 shadow-2xl shadow-black/60 ring-4 ring-amber-500/20';
  const iconSvg = isSuccess ? ICONS.checkCircle('w-5 h-5 text-emerald-300 shrink-0') : ICONS.info('w-5 h-5 text-amber-300 shrink-0');

  toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3.5 rounded-2xl flex items-center space-x-3 text-sm font-bold transition-all duration-300 transform -translate-y-12 opacity-0 pointer-events-none max-w-[92vw] ${bgColor}`;
  toast.innerHTML = `
    ${iconSvg}
    <span class="tracking-wide leading-snug">${escapeHtml(message)}</span>
  `;

  requestAnimationFrame(() => {
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3.5 rounded-2xl flex items-center space-x-3 text-sm font-bold transition-all duration-300 transform translate-y-0 opacity-100 max-w-[92vw] ${bgColor}`;
  });

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3.5 rounded-2xl flex items-center space-x-3 text-sm font-bold transition-all duration-300 transform -translate-y-12 opacity-0 pointer-events-none max-w-[92vw] ${bgColor}`;
  }, 4000);
}
