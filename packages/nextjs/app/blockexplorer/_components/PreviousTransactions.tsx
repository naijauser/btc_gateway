"use client";
import React, { useEffect, useState } from "react";

interface TxStatus {
  confirmed: boolean;
  block_height?: number;
  block_time?: number;
}

interface Transaction {
  txid: string;
  fee: number;
  size: number;
  status: TxStatus;
}

export default function PreviousTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("btcSwapTransactions");
    if (!stored) {
      setLoading(false);
      return;
    }

    const txIds: string[] = JSON.parse(stored);
    if (txIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        const results = await Promise.all(
          txIds.map(async (txid) => {
            const res = await fetch(
              `https://mempool.space/testnet4/api/tx/${txid}`,
            );
            if (!res.ok) throw new Error(`Failed to fetch ${txid}`);
            const data = await res.json();
            return {
              txid: data.txid,
              fee: data.fee,
              size: data.size,
              status: data.status,
            } as Transaction;
          }),
        );
        setTransactions(results);
      } catch (err) {
        console.error("Error fetching transaction data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 mx-auto border-2 border-primary border-t-transparent rounded-full mb-2"></div>
        <p className="text-gray-400 text-sm">Loading transactions...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No previous transactions found.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-lg font-semibold mb-2">Previous Transactions</h2>
      {transactions.map((tx) => {
        const confirmed = tx.status.confirmed;
        const blockTime = tx.status.block_time
          ? new Date(tx.status.block_time * 1000).toLocaleString()
          : "Pending";

        return (
          <div
            key={tx.txid}
            className="bg-base-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-sm"
          >
            <div>
              <a
                href={`https://mempool.space/testnet4/tx/${tx.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-function hover:underline break-all"
              >
                {tx.txid.slice(0, 20)}...
              </a>
              <p className="text-xs text-gray-400 mt-1">
                {confirmed ? (
                  <>✅ Confirmed at block {tx.status.block_height}</>
                ) : (
                  <>⏳ Unconfirmed</>
                )}
              </p>
              <p className="text-xs text-gray-500">{blockTime}</p>
            </div>

            <div className="text-right mt-2 sm:mt-0">
              <p className="text-xs text-gray-500">
                Fee: <span className="font-medium">{tx.fee} sats</span>
              </p>
              <p className="text-xs text-gray-500">
                Size: <span className="font-medium">{tx.size} bytes</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
