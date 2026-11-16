/* global jest */
// Native modules the tests can't load: stand-ins that behave the same in memory.

// react-native-mmkv (phone storage) needs native Nitro modules.
jest.mock("react-native-mmkv", () => {
  const createMMKV = () => {
    const store = new Map();
    return {
      set: (key, value) => store.set(key, value),
      getString: (key) => (typeof store.get(key) === "string" ? store.get(key) : undefined),
      getNumber: (key) => (typeof store.get(key) === "number" ? store.get(key) : undefined),
      getBoolean: (key) => (typeof store.get(key) === "boolean" ? store.get(key) : undefined),
      contains: (key) => store.has(key),
      remove: (key) => store.delete(key),
      delete: (key) => store.delete(key),
      getAllKeys: () => [...store.keys()],
      clearAll: () => store.clear()
    };
  };
  return { createMMKV, MMKV: function MMKV() { return createMMKV(); } };
});
