import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chenjinfan.personalos",
  appName: "个人工作台",
  webDir: "dist-android",
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#f7f2ea",
  },
};

export default config;
