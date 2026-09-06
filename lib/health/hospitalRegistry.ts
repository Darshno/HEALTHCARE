/**
 * Hospital Registry
 *
 * Fetches hospitals from the server database, with AsyncStorage as a fallback cache.
 * The chief doctor creates the hospital when they first sign up.
 * Other staff pick their hospital from the dropdown during registration.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

export type HospitalRecord = {
  id: number;           // Database ID
  name: string;
  language: "en" | "hi";
  createdAt: string | number;
};

const HOSPITAL_CACHE_KEY = "rural-health-access.hospitals.v4";
const HOSPITAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const DEFAULT_HOSPITALS: HospitalRecord[] = [
  {
    id: 1,
    name: "Nandipur Primary Health Centre",
    language: "en",
    createdAt: 1700000000000,
  },
  {
    id: 2,
    name: "Chandpur Community Health Centre (CHC)",
    language: "en",
    createdAt: 1700000001000,
  },
  {
    id: 3,
    name: "Rampur Sub-Divisional Civil Hospital",
    language: "en",
    createdAt: 1700000002000,
  },
  {
    id: 4,
    name: "Shivpur District General Hospital",
    language: "en",
    createdAt: 1700000003000,
  },
  {
    id: 5,
    name: "Kalyanpur Rural Referral Centre",
    language: "en",
    createdAt: 1700000004000,
  },
  {
    id: 6,
    name: "Meerapur Primary Health Centre",
    language: "en",
    createdAt: 1700000005000,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Read helpers
// ──────────────────────────────────────────────────────────────────────────────

async function fetchHospitalsFromServer(): Promise<HospitalRecord[] | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/hospitals`);
    if (!response.ok) return null;
    const hospitals = (await response.json()) as HospitalRecord[];
    
    // Cache the result locally
    await AsyncStorage.setItem(
      HOSPITAL_CACHE_KEY,
      JSON.stringify({
        hospitals,
        timestamp: Date.now(),
      }),
    );
    
    return hospitals;
  } catch (error) {
    console.warn("Failed to fetch hospitals from server:", error);
    return null;
  }
}

async function getHospitalsFromCache(): Promise<HospitalRecord[] | null> {
  try {
    const cached = await AsyncStorage.getItem(HOSPITAL_CACHE_KEY);
    if (!cached) return null;
    
    const { hospitals, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid (within TTL)
    if (Date.now() - timestamp > HOSPITAL_CACHE_TTL) {
      return null; // Cache expired
    }
    
    return hospitals;
  } catch {
    return null;
  }
}

export async function getHospitals(): Promise<HospitalRecord[]> {
  try {
    // Try to fetch fresh data from server first
    const serverHospitals = await fetchHospitalsFromServer();
    if (serverHospitals && serverHospitals.length > 0) {
      return serverHospitals;
    }
    
    // Fall back to cache if server fails
    const cachedHospitals = await getHospitalsFromCache();
    if (cachedHospitals && cachedHospitals.length > 0) {
      return cachedHospitals;
    }
    
    // Fall back to defaults if everything fails
    return DEFAULT_HOSPITALS;
  } catch {
    return DEFAULT_HOSPITALS;
  }
}

export async function getHospitalById(id: number | string): Promise<HospitalRecord | null> {
  const all = await getHospitals();
  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  return all.find((h) => h.id === numId) ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Write helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function registerHospital(
  name: string,
  language: "en" | "hi" = "en",
): Promise<HospitalRecord> {
  try {
    // Try to register on server
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/hospitals/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language }),
    });

    if (response.ok) {
      const hospital = (await response.json()) as HospitalRecord;
      // Clear cache to force refresh on next fetch
      await AsyncStorage.removeItem(HOSPITAL_CACHE_KEY);
      return hospital;
    }
  } catch (error) {
    console.warn("Failed to register hospital on server:", error);
  }

  // Fallback: just create a local hospital object if server fails
  // This ensures the app continues to work offline
  const hospital: HospitalRecord = {
    id: Math.floor(Math.random() * 1000000),
    name: name.trim(),
    language,
    createdAt: Date.now(),
  };

  // Clear cache to force refresh
  await AsyncStorage.removeItem(HOSPITAL_CACHE_KEY);
  return hospital;
}
