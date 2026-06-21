'use strict';

/**
 * Sanity and regression verification script for Offline Chat Cache Fallback.
 * This script mocks AsyncStorage, React hooks, and HTTP API clients to simulate
 * both online and offline environments and verify that:
 * 1. Cached channels and messages are successfully loaded and set.
 * 2. API failures (offline mode) do not overwrite or clear cached channels with empty data.
 * 3. Channel details are retrieved from cached channels list if the main API fails.
 */

// --- 1. Mock AsyncStorage ---
const mockStorage = new Map();
const mockAsyncStorage = {
  setItem: async (key, val) => {
    mockStorage.set(key, val);
  },
  getItem: async (key) => {
    return mockStorage.get(key) || null;
  },
  getAllKeys: async () => {
    return Array.from(mockStorage.keys());
  },
  multiRemove: async (keys) => {
    keys.forEach(k => mockStorage.delete(k));
  }
};

// --- 2. ChatCacheService Simulation (Equivalent to the TypeScript class) ---
class ChatCacheService {
  static async saveMessages(channelId, messages) {
    const key = `CHAT_CACHE:messages:${channelId}`;
    const slice = messages.slice(-100);
    await mockAsyncStorage.setItem(key, JSON.stringify(slice));
  }

  static async getMessages(channelId) {
    const key = `CHAT_CACHE:messages:${channelId}`;
    const data = await mockAsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static async saveChannels(channels) {
    const key = 'CHAT_CACHE:channels_list';
    await mockAsyncStorage.setItem(key, JSON.stringify(channels));
  }

  static async getChannels() {
    const key = 'CHAT_CACHE:channels_list';
    const data = await mockAsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static async clearCache() {
    const keys = await mockAsyncStorage.getAllKeys();
    const chatKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:'));
    if (chatKeys.length > 0) {
      await mockAsyncStorage.multiRemove(chatKeys);
    }
  }
}

// --- 3. Mock React Component State & Callbacks ---
function createComponentState() {
  let channelsState = [];
  let sortOrderState = [];
  let loadingState = true;
  let channelState = null;

  return {
    setChannels: (val) => {
      channelsState = val;
    },
    setSortOrder: (val) => {
      sortOrderState = val;
    },
    setLoading: (val) => {
      loadingState = val;
    },
    setChannel: (val) => {
      channelState = val;
    },
    getChannels: () => channelsState,
    getSortOrder: () => sortOrderState,
    getLoading: () => loadingState,
    getChannel: () => channelState,
  };
}

// --- 4. The fetchChannels Callback under test (replicated from MessagingHome.tsx) ---
async function testFetchChannels(state, httpClient, isDMChannel, findOtherParticipant, fetchStatuses) {
  // Reset loading state
  state.setLoading(true);

  // 1. Try cache load
  try {
    const cached = await ChatCacheService.getChannels();
    if (cached && cached.length > 0) {
      state.setChannels(cached);
      // Build initial sort order from cached channels
      const cachedIds = cached.map((c) => String(c._id || c.id));
      state.setSortOrder(cachedIds);
      state.setLoading(false);
      const userIds = cached
        .filter(isDMChannel)
        .map((c) => findOtherParticipant(c))
        .filter(Boolean)
        .map((other) => String(other._id || other.id));
      if (userIds.length > 0) {
        fetchStatuses(userIds);
      }
    }
  } catch (err) {
    console.warn('Failed to load cached channels list', err);
  }

  // 2. Fetch fresh from API
  try {
    const res = await httpClient.get('/channels');
    const fresh = res.data?.data || [];
    const ids = fresh.map((c) => String(c._id || c.id));
    state.setSortOrder(ids);
    state.setChannels(fresh);
    await ChatCacheService.saveChannels(fresh);
    const userIds = fresh
      .filter(isDMChannel)
      .map((c) => findOtherParticipant(c))
      .filter(Boolean)
      .map((other) => String(other._id || other.id));
    if (userIds.length > 0) {
      fetchStatuses(userIds);
    }
  } catch (err) {
    // FIXED: Instead of setChannels([]), we just log/do nothing to preserve cache!
    // If the API request failed (e.g., offline), we do not overwrite the cache list.
    // Console log is output here to verify behavior.
    console.log('[Test Log] Failed to fetch fresh channels, using cached data if available (Success path)');
  } finally {
    state.setLoading(false);
  }
}

// --- 5. The loadChannel Effect under test (replicated from useCommunityChat.ts) ---
async function testLoadChannel(state, initialChannel, initialChannelId, messagingHttpClient) {
  let mounted = true;
  
  if (initialChannel) {
    state.setChannel(initialChannel);
    return;
  }
  if (!initialChannelId) return;

  try {
    const res = await messagingHttpClient.get(`/channels/${initialChannelId}`);
    if (mounted) state.setChannel(res.data?.data || res.data || null);
  } catch (err) {
    try {
      // FIXED: Fallback to cached channels list first if offline/failed
      const cachedList = await ChatCacheService.getChannels();
      const foundCached = Array.isArray(cachedList) ? cachedList.find((c) => String(c._id || c.id) === String(initialChannelId)) : null;
      if (mounted && foundCached) {
        state.setChannel(foundCached);
        return;
      }
      
      const listRes = await messagingHttpClient.get('/channels');
      const list = listRes.data?.data || listRes.data || [];
      const found = Array.isArray(list) ? list.find((c) => String(c._id || c.id) === String(initialChannelId)) : null;
      if (mounted && found) state.setChannel(found);
    } catch (ee) { }
  }
}

// --- 6. Helper Mock Definitions ---
const mockIsDMChannel = (c) => !!(c.type === 'dm');
const mockFindOtherParticipant = (c) => c.partner;
const mockFetchStatuses = (userIds) => {};

// --- 7. Execute Test Scenarios ---
async function runTests() {
  console.log('--- RUNNING OFFLINE CACHE Fallback TESTS ---\n');

  // Test data definition
  const dummyChannels = [
    { _id: 'chan-1', name: 'General Chat', type: 'group' },
    { _id: 'chan-2', name: 'Direct Message', type: 'dm', partner: { id: 'user-22', _id: 'user-22', fullName: 'Alice' } }
  ];

  const dummyMessages = [
    { _id: 'msg-101', content: 'Hello online', createdAt: new Date().toISOString() },
    { _id: 'msg-102', content: 'Testing offline support', createdAt: new Date().toISOString() }
  ];

  // Pre-populate AsyncStorage to simulate cache of channels and messages from a previous session
  await ChatCacheService.saveChannels(dummyChannels);
  await ChatCacheService.saveMessages('chan-1', dummyMessages);

  // Assertions Helper
  const assert = (condition, msg) => {
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      process.exit(1);
    }
    console.log(`✅ PASSED: ${msg}`);
  };

  // --- TEST SCENARIO 1: Online Mode for fetchChannels ---
  console.log('Scenario 1: Fetching Channels in ONLINE Mode');
  const stateOnline = createComponentState();
  const mockHttpClientOnline = {
    get: async (url) => {
      if (url === '/channels') {
        return { data: { data: [{ _id: 'chan-1', name: 'General Chat API Version', type: 'group' }] } };
      }
      throw new Error('Not found');
    }
  };

  await testFetchChannels(stateOnline, mockHttpClientOnline, mockIsDMChannel, mockFindOtherParticipant, mockFetchStatuses);

  // Online mode should first fetch cache, then fetch fresh API and write new API content to state and storage
  assert(stateOnline.getChannels().length === 1, 'Online state should contain channels');
  assert(stateOnline.getChannels()[0].name === 'General Chat API Version', 'Online channels should show fresh API data');
  assert(stateOnline.getSortOrder().includes('chan-1'), 'SortOrder should include chan-1');
  assert(stateOnline.getLoading() === false, 'Loading should be false after completion');

  // --- TEST SCENARIO 2: Offline Mode for fetchChannels ---
  console.log('\nScenario 2: Fetching Channels in OFFLINE Mode');
  // First, verify cached data remains in storage
  const initialCache = await ChatCacheService.getChannels();
  assert(initialCache.length === 1 && initialCache[0].name === 'General Chat API Version', 'Storage has General Chat API Version');

  const stateOffline = createComponentState();
  const mockHttpClientOffline = {
    get: async () => {
      throw new Error('Network Error: Offline');
    }
  };

  await testFetchChannels(stateOffline, mockHttpClientOffline, mockIsDMChannel, mockFindOtherParticipant, mockFetchStatuses);

  // Offline mode should render cached data, initialize sortOrder, and NOT clear the list (keeps cache)
  assert(stateOffline.getChannels().length === 1, 'Offline state should render cached channels');
  assert(stateOffline.getChannels()[0].name === 'General Chat API Version', 'Offline channels should render cached content');
  assert(stateOffline.getSortOrder().includes('chan-1'), 'SortOrder should be populated with cached IDs');
  assert(stateOffline.getLoading() === false, 'Loading should be false');

  // --- TEST SCENARIO 3: Offline Mode for loadChannel (useCommunityChat) ---
  console.log('\nScenario 3: Resolving Channel Details in OFFLINE Mode');
  const chatStateOffline = createComponentState();
  const mockMessagingHttpOffline = {
    get: async () => {
      throw new Error('Network Error: Offline');
    }
  };

  await testLoadChannel(chatStateOffline, null, 'chan-1', mockMessagingHttpOffline);

  // Should fallback to local cache list and resolve the channel details successfully
  assert(chatStateOffline.getChannel() !== null, 'Channel details should not be null');
  assert(chatStateOffline.getChannel()._id === 'chan-1', 'Channel ID matches chan-1');
  assert(chatStateOffline.getChannel().name === 'General Chat API Version', 'Resolved cached channel matches');

  // --- TEST SCENARIO 4: Loading Messages in Offline Mode ---
  console.log('\nScenario 4: Retrieving Messages Cache');
  const cachedMessages = await ChatCacheService.getMessages('chan-1');
  assert(cachedMessages.length === 2, 'Should load 2 cached messages');
  assert(cachedMessages[0].content === 'Hello online', 'First message match');
  assert(cachedMessages[1].content === 'Testing offline support', 'Second message match');

  console.log('\n🎉 ALL OFFLINE CACHE TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
