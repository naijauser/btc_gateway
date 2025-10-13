import { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-stark/getMetadata";

export const metadata = getMetadata({
  title: "Vesu",
  description: "Deposit your token to Vesu",
});

const Vesu: NextPage = () => {
  return <div>Vesu Page</div>;
};

export default Vesu;
