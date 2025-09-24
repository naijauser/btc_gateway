import { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-stark/getMetadata";
import { ConnectXverseWallet } from "./_components/ConnetXverseWallet";

export const metadata = getMetadata({
  title: "Gateway",
  description: "Securely get your BTC into Defi",
});

const Gateway: NextPage = () => {
  return <ConnectXverseWallet />;
};

export default Gateway;
