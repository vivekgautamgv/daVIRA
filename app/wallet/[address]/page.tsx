import { WalletProfile } from "../../wallets";
export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <WalletProfile address={address} />;
}
