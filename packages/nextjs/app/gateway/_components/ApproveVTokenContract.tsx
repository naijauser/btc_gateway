"use client";

import { useState } from "react";
import { Contract } from "starknet";
import ERC20 from "../../../abi/ERC20.json";
import { connect } from "@starknet-io/get-starknet";

export default function ApproveVTokenContract() {
  const [inputValue, setInputValue] = useState("");
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

      const contract = new Contract({
        address:
          "0x03c50d1bb227bdd8ab94a69b28d43e67ba29bfac013d94d4cfab170a64a78989",
        abi: ERC20,
      });

      setStatus("Sending transaction...");
      const tx = await contract.invoke("your_write_function_name", [
        inputValue,
      ]); // <— change to your fn
      setTxHash(tx.transaction_hash);

      setStatus("Transaction sent!");
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  }

  return (
    <div className="p-6 max-w-sm mx-auto bg-base-200 rounded-xl shadow space-y-3">
      <h2 className="text-lg font-semibold text-primary">Write to Contract</h2>

      <input
        type="text"
        placeholder="Enter value"
        className="input input-bordered w-full"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      <button onClick={handleWrite} className="btn btn-primary w-full">
        Send Transaction
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
