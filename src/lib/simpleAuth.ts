import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SimpleUser {
  uid: string;
  id: string;
  nickname: string;
  displayName: string;
}

interface StoredAccount {
  id: string;
  passwordHash: string;
  nickname: string;
  createdAt: string;
}

const STORAGE_KEY_USERS = 'fridge_accounts_store';
const STORAGE_KEY_ACTIVE = 'fridge_active_user';

// Sanitizes username so it is a valid Firestore document ID
export function sanitizeUsername(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getLocalAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts: Record<string, StoredAccount>) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save accounts to local storage:', e);
  }
}

export function getActiveSimpleUser(): SimpleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Register account into Firestore for cross-device access (with local cache fallback)
 */
export async function registerSimpleUser(
  id: string,
  pass: string,
  nickname: string
): Promise<{ success: boolean; user?: SimpleUser; error?: string }> {
  const cleanId = sanitizeUsername(id);
  const cleanNick = nickname.trim();

  if (!cleanId) return { success: false, error: '아이디를 영문/숫자로 입력해주세요.' };
  if (!cleanNick) return { success: false, error: '닉네임을 입력해주세요.' };
  if (!pass || pass.length < 4) {
    return { success: false, error: '비밀번호는 최소 4자리 이상이어야 합니다.' };
  }

  try {
    // 1. Check if ID already exists in Firestore cloud database
    const userDocRef = doc(db, 'users', cleanId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return {
        success: false,
        error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.',
      };
    }

    const newAccount: StoredAccount = {
      id: cleanId,
      passwordHash: btoa(pass),
      nickname: cleanNick,
      createdAt: new Date().toISOString(),
    };

    // 2. Save directly to Firestore so all devices can authenticate
    await setDoc(userDocRef, newAccount);

    // 3. Cache locally
    const local = getLocalAccounts();
    local[cleanId] = newAccount;
    saveLocalAccounts(local);

    const activeUser: SimpleUser = {
      uid: `user_${cleanId}`,
      id: cleanId,
      nickname: cleanNick,
      displayName: cleanNick,
    };

    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
    return { success: true, user: activeUser };
  } catch (err: any) {
    console.error('Firestore user registration error:', err);

    // Fallback: save locally if network/permission issue
    const local = getLocalAccounts();
    if (local[cleanId]) {
      return { success: false, error: '이미 사용 중인 아이디입니다.' };
    }
    const newAccount: StoredAccount = {
      id: cleanId,
      passwordHash: btoa(pass),
      nickname: cleanNick,
      createdAt: new Date().toISOString(),
    };
    local[cleanId] = newAccount;
    saveLocalAccounts(local);

    const activeUser: SimpleUser = {
      uid: `user_${cleanId}`,
      id: cleanId,
      nickname: cleanNick,
      displayName: cleanNick,
    };
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
    return { success: true, user: activeUser };
  }
}

/**
 * Log in account from Firestore (cross-device) with local migration support
 */
export async function loginSimpleUser(
  id: string,
  pass: string
): Promise<{ success: boolean; user?: SimpleUser; error?: string }> {
  const cleanId = sanitizeUsername(id);
  if (!cleanId) {
    return { success: false, error: '아이디를 입력해주세요.' };
  }

  try {
    // 1. Check in Firestore cloud database
    const userDocRef = doc(db, 'users', cleanId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as StoredAccount;
      if (data.passwordHash !== btoa(pass)) {
        return { success: false, error: '비밀번호가 일치하지 않습니다.' };
      }

      const activeUser: SimpleUser = {
        uid: `user_${cleanId}`,
        id: cleanId,
        nickname: data.nickname || cleanId,
        displayName: data.nickname || cleanId,
      };

      // Cache locally
      const local = getLocalAccounts();
      local[cleanId] = data;
      saveLocalAccounts(local);

      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
      return { success: true, user: activeUser };
    }

    // 2. Legacy fallback: check if it was previously created only on this device's localStorage
    const local = getLocalAccounts();
    const localAccount = local[cleanId];

    if (localAccount) {
      if (localAccount.passwordHash !== btoa(pass)) {
        return { success: false, error: '비밀번호가 일치하지 않습니다.' };
      }

      // Automatically migrate this local account to Firestore cloud for cross-device access!
      try {
        await setDoc(userDocRef, localAccount);
      } catch (migrateErr) {
        console.warn('Auto-migration to Firestore skipped:', migrateErr);
      }

      const activeUser: SimpleUser = {
        uid: `user_${cleanId}`,
        id: cleanId,
        nickname: localAccount.nickname || cleanId,
        displayName: localAccount.nickname || cleanId,
      };

      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
      return { success: true, user: activeUser };
    }

    return {
      success: false,
      error: '등록되지 않은 아이디입니다. 먼저 회원가입을 해주세요.',
    };
  } catch (err: any) {
    console.warn('Firestore login error, checking local store:', err);

    // If offline or network issue, fallback to local store
    const local = getLocalAccounts();
    const localAccount = local[cleanId];
    if (localAccount) {
      if (localAccount.passwordHash !== btoa(pass)) {
        return { success: false, error: '비밀번호가 일치하지 않습니다.' };
      }
      const activeUser: SimpleUser = {
        uid: `user_${cleanId}`,
        id: cleanId,
        nickname: localAccount.nickname || cleanId,
        displayName: localAccount.nickname || cleanId,
      };
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
      return { success: true, user: activeUser };
    }

    return {
      success: false,
      error: '로그인에 실패했습니다. 네트워크 연결을 확인해주세요.',
    };
  }
}

export function logoutSimpleUser() {
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
}
