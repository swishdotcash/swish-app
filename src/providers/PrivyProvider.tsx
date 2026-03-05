import { PrivyProvider as ExpoPrivyProvider } from "@privy-io/expo";

const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID || "";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    console.warn("EXPO_PUBLIC_PRIVY_APP_ID not set");
    return <>{children}</>;
  }

  return (
    <ExpoPrivyProvider appId={PRIVY_APP_ID}>{children}</ExpoPrivyProvider>
  );
}
