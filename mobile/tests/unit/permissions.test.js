const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Read the permissions.ts file
const tsPath = path.join(__dirname, '../../src/shared/utils/permissions.ts');
let code = fs.readFileSync(tsPath, 'utf8');

// Simple ESM/TS parsing for VM runner
code = code.replace(/import AsyncStorage from '@react-native-async-storage\/async-storage';/g, '');
code = code.replace(/import \* as ImagePicker from 'expo-image-picker';/g, '');
code = code.replace(/: Promise<boolean>/g, '');
code = code.replace(/export const/g, 'const');
code = code.replace(/export async function/g, 'async function');
code += '\nmodule.exports = { PERM_KEY, requestStartupPermissions };\n';

async function runTests() {
  console.log('Running StartupPermissions Unit Tests...\n');

  let testCount = 0;
  let passCount = 0;

  async function testAsync(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passCount++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`);
      console.error(e);
    }
  }

  // Helper to compile/instantiate the module with custom mocks
  function loadModule(mocks) {
    const virtualModule = { exports: {} };
    const context = vm.createContext({
      module: virtualModule,
      exports: virtualModule.exports,
      AsyncStorage: mocks.AsyncStorage,
      ImagePicker: mocks.ImagePicker,
      require: (mod) => {
        if (mod === 'expo-av') {
          return mocks.ExpoAV;
        }
        throw new Error(`Unexpected require: ${mod}`);
      },
      console: console,
    });

    vm.runInContext(code, context);
    return virtualModule.exports;
  }

  // -- Test Case 1: First Run / New Install --
  await testAsync('Should trigger all permissions on a new install and save status', async () => {
    const called = [];
    const storage = {};

    const mockMocks = {
      AsyncStorage: {
        getItem: async (key) => storage[key] || null,
        setItem: async (key, val) => {
          storage[key] = val;
        },
      },
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => {
          called.push('mediaLibrary');
          return { granted: true };
        },
        requestCameraPermissionsAsync: async () => {
          called.push('camera');
          return { granted: true };
        },
      },
      ExpoAV: {
        Audio: {
          requestPermissionsAsync: async () => {
            called.push('microphone');
            return { granted: true };
          },
        },
      },
    };

    const mod = loadModule(mockMocks);
    const result = await mod.requestStartupPermissions();

    assert.strictEqual(result, true, 'Should return true representing permissions requested');
    assert.deepStrictEqual(called, ['mediaLibrary', 'camera', 'microphone'], 'All three permissions should be called sequentially');
    assert.ok(storage[mod.PERM_KEY], 'Should save that permissions were requested in storage');
  });

  // -- Test Case 2: Subsequent Runs --
  await testAsync('Should skip requesting permissions if already requested previously', async () => {
    const called = [];
    const storage = {
      '@app_perms_requested_v1': '1718961500000',
    };

    const mockMocks = {
      AsyncStorage: {
        getItem: async (key) => storage[key] || null,
        setItem: async (key, val) => {
          storage[key] = val;
        },
      },
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => {
          called.push('mediaLibrary');
        },
        requestCameraPermissionsAsync: async () => {
          called.push('camera');
        },
      },
      ExpoAV: {
        Audio: {
          requestPermissionsAsync: async () => {
            called.push('microphone');
          },
        },
      },
    };

    const mod = loadModule(mockMocks);
    const result = await mod.requestStartupPermissions();

    assert.strictEqual(result, false, 'Should return false representing no permissions requested');
    assert.strictEqual(called.length, 0, 'No permissions should be requested');
  });

  // -- Test Case 3: Error Isolation / Cascading Failures --
  await testAsync('Should continue requesting other permissions if one fails', async () => {
    const called = [];
    const storage = {};

    const mockMocks = {
      AsyncStorage: {
        getItem: async (key) => storage[key] || null,
        setItem: async (key, val) => {
          storage[key] = val;
        },
      },
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => {
          called.push('mediaLibrary');
          throw new Error('Simulated media library error');
        },
        requestCameraPermissionsAsync: async () => {
          called.push('camera');
          return { granted: true };
        },
      },
      ExpoAV: {
        Audio: {
          requestPermissionsAsync: async () => {
            called.push('microphone');
            return { granted: true };
          },
        },
      },
    };

    const mod = loadModule(mockMocks);
    const result = await mod.requestStartupPermissions();

    assert.strictEqual(result, true, 'Should still complete and return true');
    assert.deepStrictEqual(called, ['mediaLibrary', 'camera', 'microphone'], 'All permissions should still be attempted');
    assert.ok(storage[mod.PERM_KEY], 'Should save requested state in storage despite failure');
  });

  console.log(`\nTests finished: ${passCount}/${testCount} passed.\n`);
  if (passCount !== testCount) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Unhandled test runner error:', e);
  process.exit(1);
});
