# Cross-Device Hospital Synchronization Testing Guide

## Architecture Overview

### What Changed
- **Before:** Hospitals stored in AsyncStorage (local device only) ❌
- **After:** Hospitals stored in PostgreSQL, fetched from server ✅

### Components
1. **Server Module** (`server/modules/hospital/`)
   - REST API: `GET /api/hospitals`, `POST /api/hospitals/register`
   - Data persistence in PostgreSQL

2. **Client Registry** (`lib/health/hospitalRegistry.ts`)
   - Fetches from server first
   - Falls back to AsyncStorage cache (5-min TTL)
   - Falls back to hardcoded defaults

3. **Login UI** (`components/health/AuthScreen.tsx`)
   - Displays hospital list in dropdown
   - Handles numeric hospital IDs from server

## Test Plan

### Test 1: Basic Server Connectivity
**Objective:** Verify the hospital API endpoints are working

```bash
# Terminal 1: Start the server
npm run start:server

# Terminal 2: Test the endpoints
# Get all hospitals
curl http://localhost:3000/api/hospitals

# Register a new hospital
curl -X POST http://localhost:3000/api/hospitals/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Hospital","language":"en"}'
```

**Expected Results:**
- GET returns array of hospitals with numeric IDs
- POST returns newly created hospital object
- Both endpoints respond with 200 status

### Test 2: Client Fetch Test
**Objective:** Verify client can fetch hospitals from server

**In React Component (e.g., AuthScreen):**
```typescript
import { getHospitals } from "@/lib/health/hospitalRegistry";

// In component or test
const hospitals = await getHospitals();
console.log(hospitals); // Should show list with numeric IDs

// Or call directly
const hospitals = await fetchHospitalsFromServer();
console.log(hospitals); // Should match server response
```

**Expected Results:**
- Returns array of hospitals from server
- Each hospital has `id: number` (not string)
- Works on both web and mobile

### Test 3: Single-Device Registration
**Objective:** Verify a hospital can be registered and appears in list

**Manual Steps:**
1. Start the app on Device/Browser
2. Go to login screen
3. Click on "Register" → "New Chief Doctor"
4. Enter hospital name (e.g., "Central Hospital")
5. Complete registration
6. Go back to login, hospital dropdown should show new hospital

**Expected Results:**
- New hospital appears in hospital dropdown immediately
- Hospital ID is numeric (e.g., 7, 8, 9...)
- Refresh dropdown shows hospital is still there

### Test 4: Cross-Device Synchronization (Main Test)
**Objective:** Verify hospitals appear on different devices

**Setup:**
- Have two browsers/devices ready
- Both pointing to same backend server

**Procedure:**

**Device 1 (Chief Doctor Registration):**
1. Open app on Device 1
2. Go to Register → Chief Doctor
3. Hospital name: "Multi-Device Hospital"
4. Complete full registration
5. Verify hospital appears in device 1's dropdown

**Device 2 (Verification):**
1. Open app on Device 2 (different browser/computer)
2. Go to login screen
3. Check hospital dropdown
4. **Expected:** "Multi-Device Hospital" should appear in list
5. Click it, select Staff role, and verify you can sign up
6. Create staff user account successfully

**Expected Results:**
- Hospital registered on Device 1 appears on Device 2 ✅
- No manual refresh needed (automatic fetch on login)
- Can sign up as staff using hospital from Device 1
- Can log in with different staff credentials on Device 2

### Test 5: Offline Fallback
**Objective:** Verify app works when server is unavailable

**Procedure:**
1. Load app on Device 1 (server running) to populate cache
2. Register a hospital and verify it loads
3. Stop the server
4. Refresh/reopen app on Device 1
5. Hospital list should still show from cache
6. Restart server and refresh again
7. Fresh list should load from server

**Expected Results:**
- Works offline with cached hospitals (5 min TTL)
- After server comes back, fresh data loads
- No crashes or blank hospital lists

### Test 6: API Base URL Configuration
**Objective:** Verify correct server URL is being used

**Check these locations:**
```typescript
// constants/oauth.ts - exports getApiBaseUrl()
getApiBaseUrl()  // Should return correct API base URL

// lib/health/hospitalRegistry.ts - uses getApiBaseUrl()
const baseUrl = getApiBaseUrl();
fetch(`${baseUrl}/api/hospitals`)
```

**Expected Results:**
- On local dev: `http://localhost:3000`
- On deployed: correct Render/production URL
- No hardcoded URLs

## Implementation Status

### ✅ Completed
- Server hospital module created
- Client fetch logic implemented
- AuthScreen updated for numeric IDs
- Import paths fixed (getApiBaseUrl)

### ⏳ To Verify
- [ ] Server endpoints respond correctly
- [ ] Client fetches hospital list successfully
- [ ] Single device registration works
- [ ] **Cross-device sync works** (MAIN TEST)
- [ ] Offline caching works
- [ ] Numeric ID handling consistent

## Debugging Tips

### Issue: "Failed to fetch hospitals from server"
- Check server is running: `npm run start:server`
- Check API URL: `console.log(getApiBaseUrl())`
- Check network tab: Should see `GET /api/hospitals` request

### Issue: Hospital list is empty
- Check server database: `SELECT * FROM hospital;`
- Check cache: `AsyncStorage.getItem("rural-health-access.hospitals.v4")`
- Check defaults fallback in hospitalRegistry.ts

### Issue: Hospital ID mismatch
- Ensure AuthScreen.tsx uses `String(h.id)` for state management
- Numeric ID from server → string for state consistency
- Check `selectedHospitalId` type is `string`

### Issue: Same hospital appears on both web and mobile?
- Yes! That's correct - both use same backend database
- Different devices = different AsyncStorage = isolated cache (expected)
- But both fetch from same server = same hospital data

## Success Criteria

✅ Cross-device sync is working when ALL of these pass:
1. Hospital registered on Device A
2. Immediately visible in Device B's dropdown (no manual sync needed)
3. Staff can successfully register using hospital from Device A on Device B
4. Same hospital is not duplicated (no ghost entries)
5. Offline mode shows cached hospitals
6. App doesn't crash with network errors

## Quick Test Script

```bash
#!/bin/bash
# Register hospital from CLI
HOSPITAL_ID=$(curl -s -X POST http://localhost:3000/api/hospitals/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test '$(date +%s)'","language":"en"}' | jq '.id')

echo "Created hospital with ID: $HOSPITAL_ID"

# Verify it appears in list
curl -s http://localhost:3000/api/hospitals | jq '.[].name'
```
