"use client";

import { useEffect, useState } from "react";
import { Contract, RpcProvider, shortString, Uint256, uint256 } from "starknet";
import ERC20 from "../../../abi/ERC20.json";

export default function TokenInfo() {
  const [data, setData] = useState<{
    name?: string;
    symbol?: string;
    balance?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const userAddress =
    "0x001d4a89c5501d4b44f101115197ae29ad54ebb081505039787c2833c18c899c";
  const contractAddress =
    "0x0274b83d313f1a0b6e31bd1dfc17e7490654ddf2f21d5f2d38ebd3472963e3a3";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const provider = new RpcProvider({
          nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
        });

        const erc20 = new Contract({
          address: contractAddress,
          abi: ERC20,
          providerOrAccount: provider,
        });

        const nameRaw = await erc20.name();
        const symbolRaw = await erc20.symbol();
        const balanceRaw = await erc20.balanceOf(userAddress);

        // unwrap values
        const name = shortString.decodeShortString(
          Object.values(nameRaw)[0] as string,
        );
        const symbol = shortString.decodeShortString(
          Object.values(symbolRaw)[0] as string,
        );
        const balance = Object.values(balanceRaw)[0];

        const humanReadableBalance = uint256
          .uint256ToBN(balance as Uint256)
          .toString();

        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Balance:", humanReadableBalance);

        setData({
          name: name?.toString(),
          symbol: symbol?.toString(),
          balance: balance?.toString(),
        });
      } catch (err) {
        console.error("Error fetching token info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-base-200 shadow-md rounded-2xl border border-base-300 w-full max-w-2xl mx-auto mt-6">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-function">
          Token Information
        </h2>

        {loading ? (
          <div className="text-center text-gray-500 animate-pulse">
            Loading token data...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-semibold text-gray-400">Contract Name:</div>
            <div>{data.name || "—"}</div>

            <div className="font-semibold text-gray-400">Symbol:</div>
            <div>{data.symbol || "—"}</div>

            <div className="font-semibold text-gray-400">User Address:</div>
            <div className="truncate">{userAddress}</div>

            <div className="font-semibold text-gray-400">Balance:</div>
            <div>{data.balance || "0"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
