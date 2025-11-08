Module.onRuntimeInitialized = () => {
  console.log("WASM Module Initialized!");
  Module.ccall("test_console", null, ["number", "number"], [123, 456]);
};
