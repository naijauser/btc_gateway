"use client";

import { useState } from "react";
import {
  Account,
  AllowArray,
  Call,
  CallData,
  Contract,
  stark,
  uint256,
  WalletAccount,
} from "starknet";
import ERC20 from "../../../abi/ERC20.json";
import { connect } from "@starknet-io/get-starknet";
import { StarknetSigner } from "@atomiqlabs/chain-starknet";

export default function ApproveVTokenContract() {
  // const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleWrite() {
    try {
      let swo = await connect({
        modalMode: "alwaysAsk",
      });
      if (!swo) {
        console.error("Wallet not connected.");
        setStatus("Wallet not connected");
        return;
      }

      console.log("swo", swo);
      // This logic reads a contract
      const erc20 = new Contract({
        address:
          "0x03c50d1bb227bdd8ab94a69b28d43e67ba29bfac013d94d4cfab170a64a78989",
        abi: ERC20,
      });

      setStatus("Sending transaction...");
      const balance = await erc20.balanceOf(
        "0x001d4a89c5501d4b44f101115197ae29ad54ebb081505039787c2833c18c899c",
      );
      console.log("balance", balance);

      setStatus("Transaction sent!");
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  }

  async function writeLogic() {
    let selectedWalletSWO = await connect({
      modalMode: "alwaysAsk",
    });
    if (!selectedWalletSWO) {
      console.error("Wallet not connected.");
      setStatus("Wallet not connected");
      return;
    }

    console.log("swo", selectedWalletSWO);

    const nodeUrl = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";
    const myWalletAccount = await WalletAccount.connect(
      { nodeUrl },
      selectedWalletSWO,
    );
    console.log("account", myWalletAccount);

    const contractAddress =
      "0x03c50d1bb227bdd8ab94a69b28d43e67ba29bfac013d94d4cfab170a64a78989";
    const entryPoint = "approve";
    const calldata = CallData.compile({
      spender:
        "0x0274b83d313f1a0b6e31bd1dfc17e7490654ddf2f21d5f2d38ebd3472963e3a3",
      amount: uint256.bnToUint256(100n),
    });

    try {
      const result = myWalletAccount.execute({
        contractAddress,
        entrypoint: entryPoint,
        calldata,
      });
    } catch (e) {
      console.log("error", e);
    }
  }

  return (
    <div className="p-6 max-w-sm mx-auto bg-base-200 rounded-xl shadow space-y-3">
      <h2 className="text-lg font-semibold text-primary">Write to Contract</h2>
      {/* 
        <input
          type="text"
          placeholder="Enter value"
          className="input input-bordered w-full"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        /> 
      */}

      <button onClick={writeLogic} className="btn btn-primary w-full">
        Approve vWSTETH Contract
      </button>

      {status && <p className="text-sm mt-2 text-base-content">{status}</p>}

      {txHash && (
        <a
          href={`https://starkscan.co/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-blue-400 text-sm mt-1 break-all"
        >
          View on Starkscan
        </a>
      )}
    </div>
  );
}
