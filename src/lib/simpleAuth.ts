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

function getAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts: Record<string, StoredAccount>) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save accounts to storage:', e);
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

export function registerSimpleUser(
  id: string,
  pass: string,
  nickname: string
): { success: boolean; user?: SimpleUser; error?: string } {
  const cleanId = id.trim().toLowerCase();
  const cleanNick = nickname.trim();

  if (!cleanId) return { success: false, error: '아이디를 입력해주세요.' };
  if (!cleanNick) return { success: false, error: '닉네임을 입력해주세요.' };
  if (!pass || pass.length < 4) {
    return { success: false, error: '비밀번호는 최소 4자리 이상이어야 합니다.' };
  }

  const accounts = getAccounts();
  if (accounts[cleanId]) {
    return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
  }

  // Save new account
  accounts[cleanId] = {
    id: cleanId,
    passwordHash: btoa(pass),
    nickname: cleanNick,
    createdAt: new Date().toISOString(),
  };
  saveAccounts(accounts);

  const activeUser: SimpleUser = {
    uid: `user_${cleanId}`,
    id: cleanId,
    nickname: cleanNick,
    displayName: cleanNick,
  };

  localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
  return { success: true, user: activeUser };
}

export function loginSimpleUser(
  id: string,
  pass: string
): { success: boolean; user?: SimpleUser; error?: string } {
  const cleanId = id.trim().toLowerCase();
  const accounts = getAccounts();
  const account = accounts[cleanId];

  if (!account) {
    return { success: false, error: '등록되지 않은 아이디입니다. 먼저 회원가입을 해주세요.' };
  }

  if (account.passwordHash !== btoa(pass)) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' };
  }

  const activeUser: SimpleUser = {
    uid: `user_${cleanId}`,
    id: cleanId,
    nickname: account.nickname,
    displayName: account.nickname,
  };

  localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeUser));
  return { success: true, user: activeUser };
}

export function logoutSimpleUser() {
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
}
