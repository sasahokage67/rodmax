import { AnglerProfile } from '../types';

export interface StoredUser {
  callsign: string;
  passwordHash: string;
  profile: AnglerProfile;
  updatedAt: string;
}

const STORAGE_USERS_KEY = 'rodmax_users_registry_v1';
const CURRENT_USER_KEY = 'rodmax_active_user_v1';

export const getUsersDb = (): Record<string, StoredUser> => {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveUsersDb = (db: Record<string, StoredUser>) => {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(db));
  } catch {
    // fallback
  }
};

export const registerUser = (
  callsign: string, 
  password: string, 
  initialProfile: AnglerProfile
): { success: boolean; profile?: AnglerProfile; error?: string } => {
  const cleanName = callsign.trim();
  if (cleanName.length < 3) {
    return { success: false, error: 'ПОЗЫВНОЙ ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 3 СИМВОЛОВ' };
  }
  const validPattern = /^[a-zA-Z0-9._]+$/;
  if (!validPattern.test(cleanName)) {
    return { success: false, error: 'РАЗРЕШЕНЫ ТОЛЬКО АНГЛИЙСКИЕ БУКВЫ, ЦИФРЫ, ТОЧКИ И ПОДЧЕРКИВАНИЯ (_)' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'ПАРОЛЬ ДОЛЖЕН СОДЕРЖАТЬ НЕ МЕНЕЕ 8 СИМВОЛОВ' };
  }

  const db = getUsersDb();
  const lowerKey = cleanName.toLowerCase();

  if (db[lowerKey]) {
    return { success: false, error: 'ЭТОТ ПОЗЫВНОЙ УЖЕ ЗАНЯТ! ЕСЛИ ЭТО ВЫ — НАЖМИТЕ «ВОЙТИ»' };
  }

  const newProfile: AnglerProfile = {
    ...initialProfile,
    callsign: cleanName,
    isRegistered: true,
    coins: Math.max(initialProfile.coins, 1000)
  };

  db[lowerKey] = {
    callsign: cleanName,
    passwordHash: password,
    profile: newProfile,
    updatedAt: new Date().toISOString()
  };

  saveUsersDb(db);
  try {
    localStorage.setItem(CURRENT_USER_KEY, lowerKey);
    localStorage.setItem('rodmax_profile_v2', JSON.stringify(newProfile));
  } catch {
    // ignore
  }

  return { success: true, profile: newProfile };
};

export const loginUser = (
  callsign: string, 
  password: string
): { success: boolean; profile?: AnglerProfile; error?: string } => {
  const cleanName = callsign.trim();
  if (!cleanName) {
    return { success: false, error: 'ВВЕДИТЕ ПОЗЫВНОЙ' };
  }
  if (!password) {
    return { success: false, error: 'ВВЕДИТЕ ПАРОЛЬ' };
  }
  if (password.length < 8) {
    return { success: false, error: 'ПАРОЛЬ ДОЛЖЕН СОДЕРЖАТЬ НЕ МЕНЕЕ 8 СИМВОЛОВ' };
  }

  const db = getUsersDb();
  const lowerKey = cleanName.toLowerCase();
  const user = db[lowerKey];

  if (!user) {
    // Check if legacy profile in rodmax_profile_v2 exists and matches
    try {
      const legacy = localStorage.getItem('rodmax_profile_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed.callsign && parsed.callsign.toLowerCase() === lowerKey) {
          const migratedProfile: AnglerProfile = {
            ...parsed,
            isRegistered: true
          };
          db[lowerKey] = {
            callsign: parsed.callsign,
            passwordHash: password,
            profile: migratedProfile,
            updatedAt: new Date().toISOString()
          };
          saveUsersDb(db);
          localStorage.setItem(CURRENT_USER_KEY, lowerKey);
          return { success: true, profile: migratedProfile };
        }
      }
    } catch {
      // ignore
    }

    return { success: false, error: 'АККАУНТ НЕ НАЙДЕН. ПРОВЕРЬТЕ ПОЗЫВНОЙ ИЛИ ЗАРЕГИСТРИРУЙТЕСЬ' };
  }

  if (user.passwordHash !== password) {
    return { success: false, error: 'НЕВЕРНЫЙ ПАРОЛЬ! ПРОВЕРЬТЕ РАСКЛАДКУ И ПОПРОБУЙТЕ СНОВА' };
  }

  try {
    localStorage.setItem(CURRENT_USER_KEY, lowerKey);
    localStorage.setItem('rodmax_profile_v2', JSON.stringify(user.profile));
  } catch {
    // ignore
  }

  return { success: true, profile: user.profile };
};

export const syncProfileToStorage = (profile: AnglerProfile) => {
  if (!profile.isRegistered || !profile.callsign) return;
  const db = getUsersDb();
  const lowerKey = profile.callsign.toLowerCase();
  if (db[lowerKey]) {
    db[lowerKey].profile = profile;
    db[lowerKey].updatedAt = new Date().toISOString();
    saveUsersDb(db);
  }
  try {
    localStorage.setItem('rodmax_profile_v2', JSON.stringify(profile));
  } catch {
    // ignore
  }
};
