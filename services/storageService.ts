
import { Product, Category, Sale, InventoryMovement, DayClosure, FinancialSettings, AutoSaveConfig, Role, User } from '../types';

const KEYS = {
  // LocalStorage (Permanent)
  PRODUCTS: 'gourmet_products',
  CATEGORIES: 'gourmet_categories',
  SALES: 'gourmet_sales',
  MOVEMENTS: 'gourmet_movements',
  CLOSURES: 'gourmet_closures',
  ACTIVE_CLOSURE: 'gourmet_active_closure',
  SETTINGS: 'gourmet_settings',
  AUTOSAVE: 'gourmet_autosave_config',
  ROLES: 'gourmet_roles',
  USERS: 'gourmet_users',
  // SessionStorage (Temporary)
  SESSION_USER: 'gourmet_session_user',
};

const safeLoad = <T>(key: string, defaultValue: T, storage: Storage = localStorage): T => {
  try {
    const saved = storage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Error loading key "${key}" from storage:`, error);
    return defaultValue;
  }
};

export const storageService = {
  // App Data (LocalStorage)
  saveProducts: (products: Product[]) => localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products)),
  loadProducts: (): Product[] => safeLoad(KEYS.PRODUCTS, []),

  saveCategories: (categories: Category[]) => localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)),
  loadCategories: (): Category[] => safeLoad(KEYS.CATEGORIES, []),

  saveSales: (sales: Sale[]) => localStorage.setItem(KEYS.SALES, JSON.stringify(sales)),
  loadSales: (): Sale[] => safeLoad(KEYS.SALES, []),

  saveMovements: (movements: InventoryMovement[]) => localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(movements)),
  loadMovements: (): InventoryMovement[] => safeLoad(KEYS.MOVEMENTS, []),

  saveClosures: (closures: DayClosure[]) => localStorage.setItem(KEYS.CLOSURES, JSON.stringify(closures)),
  loadClosures: (): DayClosure[] => safeLoad(KEYS.CLOSURES, []),

  saveActiveClosure: (closure: DayClosure | null) => localStorage.setItem(KEYS.ACTIVE_CLOSURE, JSON.stringify(closure)),
  loadActiveClosure: (): DayClosure | null => safeLoad(KEYS.ACTIVE_CLOSURE, null),

  saveSettings: (settings: FinancialSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)),
  loadSettings: (defaultSettings: FinancialSettings): FinancialSettings => safeLoad(KEYS.SETTINGS, defaultSettings),

  saveAutoSaveConfig: (config: AutoSaveConfig) => localStorage.setItem(KEYS.AUTOSAVE, JSON.stringify(config)),
  loadAutoSaveConfig: (defaultConfig: AutoSaveConfig): AutoSaveConfig => safeLoad(KEYS.AUTOSAVE, defaultConfig),

  saveRoles: (roles: Role[]) => localStorage.setItem(KEYS.ROLES, JSON.stringify(roles)),
  loadRoles: (): Role[] => safeLoad(KEYS.ROLES, []),

  saveUsers: (users: User[]) => localStorage.setItem(KEYS.USERS, JSON.stringify(users)),
  loadUsers: (): User[] => safeLoad(KEYS.USERS, []),

  // Session Data (SessionStorage)
  saveSessionUser: (user: User | null) => sessionStorage.setItem(KEYS.SESSION_USER, JSON.stringify(user)),
  loadSessionUser: (): User | null => safeLoad(KEYS.SESSION_USER, null, sessionStorage),
  clearSession: () => sessionStorage.removeItem(KEYS.SESSION_USER),

  // Global
  clearAll: () => {
    localStorage.clear();
    sessionStorage.clear();
  },
};
