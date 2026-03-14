import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  onSnapshot,
  query,
  where,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Category, Sale, InventoryMovement, User, DayClosure, Role, FinancialSettings } from '../types';

export const firebaseService = {
  // Products
  subscribeProducts: (callback: (products: Product[]) => void) => {
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      callback(products);
    });
  },
  saveProduct: async (product: Product) => {
    await setDoc(doc(db, 'products', product.id), product);
  },
  deleteProduct: async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
  },

  // Categories
  subscribeCategories: (callback: (categories: Category[]) => void) => {
    return onSnapshot(collection(db, 'categories'), (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      callback(categories);
    });
  },
  saveCategory: async (category: Category) => {
    await setDoc(doc(db, 'categories', category.id), category);
  },

  // Sales
  subscribeSales: (callback: (sales: Sale[]) => void) => {
    return onSnapshot(collection(db, 'sales'), (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
      callback(sales);
    });
  },
  addSale: async (sale: Sale) => {
    await setDoc(doc(db, 'sales', sale.id), sale);
  },
  deleteSale: async (saleId: string) => {
    await deleteDoc(doc(db, 'sales', saleId));
  },

  // Movements
  subscribeMovements: (callback: (movements: InventoryMovement[]) => void) => {
    return onSnapshot(collection(db, 'movements'), (snapshot) => {
      const movements = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryMovement));
      callback(movements);
    });
  },
  addMovement: async (movement: InventoryMovement) => {
    await setDoc(doc(db, 'movements', movement.id), movement);
  },

  // Users
  subscribeUsers: (callback: (users: User[]) => void) => {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      callback(users);
    });
  },
  saveUser: async (user: User) => {
    await setDoc(doc(db, 'users', user.id), user);
  },
  deleteUser: async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  },
  getUser: async (userId: string) => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as User : null;
  },

  // Roles
  subscribeRoles: (callback: (roles: Role[]) => void) => {
    return onSnapshot(collection(db, 'roles'), (snapshot) => {
      const roles = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Role));
      callback(roles);
    });
  },
  saveRole: async (role: Role) => {
    await setDoc(doc(db, 'roles', role.id), role);
  },
  deleteRole: async (roleId: string) => {
    await deleteDoc(doc(db, 'roles', roleId));
  },

  // Settings
  subscribeSettings: (callback: (settings: FinancialSettings) => void) => {
    return onSnapshot(doc(db, 'settings', 'business'), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as FinancialSettings);
      }
    });
  },
  saveSettings: async (settings: FinancialSettings) => {
    await setDoc(doc(db, 'settings', 'business'), settings);
  },

  // Closures
  subscribeClosures: (callback: (closures: DayClosure[]) => void) => {
    return onSnapshot(collection(db, 'closures'), (snapshot) => {
      const closures = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DayClosure));
      callback(closures);
    });
  },
  saveClosure: async (closure: DayClosure) => {
    await setDoc(doc(db, 'closures', closure.id), closure);
  },
  subscribeActiveClosure: (callback: (closure: DayClosure | null) => void) => {
    return onSnapshot(doc(db, 'active_closure', 'current'), (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() as DayClosure : null);
    });
  },
  saveActiveClosure: async (closure: DayClosure | null) => {
    if (closure) {
      await setDoc(doc(db, 'active_closure', 'current'), closure);
    } else {
      await deleteDoc(doc(db, 'active_closure', 'current'));
    }
  }
};
