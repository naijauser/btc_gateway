import { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-stark/getMetadata";
import ApproveVTokenContract from "./_components/ApproveVTokenContract";

export const metadata = getMetadata({
  title: "Vesu",
  description: "Deposit your token to Vesu",
});

const Vesu: NextPage = () => {
  return <ApproveVTokenContract />;
};

export default Vesu;
