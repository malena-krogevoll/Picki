import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.77e1798dd04e4b42ad46623dfc05ad1e",
  appName: "Picki",
  webDir: "dist",
  server: {
    url: "https://77e1798d-d04e-4b42-ad46-623dfc05ad1e.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
