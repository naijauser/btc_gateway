"use client";

import {
  RpcProviderWithRetries,
  StarknetInitializer,
  StarknetInitializerType,
  StarknetSigner,
} from "@atomiqlabs/chain-starknet";
import {
  BitcoinNetwork,
  FeeType,
  SpvFromBTCSwapState,
  SwapperFactory,
} from "@atomiqlabs/sdk";
import { Transaction } from "@scure/btc-signer/transaction";
import { connect } from "@starknet-io/get-starknet";
import { useState } from "react";
import {
  AddressPurpose,
  request,
  RpcErrorCode,
  RpcResult,
  SignPsbtResult,
} from "sats-connect";
import { Account, Signer } from "starknet";

// Example mock swap data (replace with real data from your swap object)
const mockSwap = {
  getId: () => "swap_abc123",
  getInputWithoutFee: () => "0.0098 BTC",
  getFee: () => ({ amountInSrcToken: "0.0002 BTC" }),
  getFeeBreakdown: () => [
    { type: "Protocol", fee: { amountInSrcToken: "0.0001 BTC" } },
    { type: "Network", fee: { amountInSrcToken: "0.0001 BTC" } },
  ],
  getInput: () => "0.01 BTC",
  getOutput: () => "12.54 STRK",
  getQuoteExpiry: () => Date.now() + 60_000, // 1 min expiry
  getPriceInfo: () => ({
    swapPrice: "1250",
    marketPrice: "1262",
    difference: "-0.95%",
  }),
  minimumBtcFeeRate: 6,
};

export function Swap() {
  const [fromToken, setFromToken] = useState("BTC");
  const [toToken, setToToken] = useState("STRK");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const swapTokens = async () => {
    try {
      const Factory = new SwapperFactory<[StarknetInitializerType]>([
        StarknetInitializer,
      ] as const);
      const Tokens = Factory.Tokens;
      const BTC_TOKEN = Tokens.BITCOIN.BTC;
      const STARKNET_TOKEN = Tokens.STARKNET.STRK;
      const nodeUrl = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";
      const starknetRpcProvider = new RpcProviderWithRetries({
        nodeUrl,
      });

      let swo = await connect();
      if (!swo) {
        console.error(
          "Xverse Wallet not found. Please install the Xverse Wallet extension.",
        );
        return;
      }

      const response = await request("wallet_connect", {
        addresses: [
          AddressPurpose.Ordinals,
          AddressPurpose.Payment,
          AddressPurpose.Stacks,
          AddressPurpose.Starknet,
          AddressPurpose.Spark,
        ],
      });

      console.log(response);

      if (response.status == "success") {
        const paymentAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment,
        );

        console.log("paymentAddressItem: ", paymentAddressItem);

        const x = swo as any;
        let destinationSmartchainWallet = x["selectedAddress"];
        console.log("selectedAddress", x["selectedAddress"]);

        const wallet = new StarknetSigner(swo as unknown as Account);
        console.log("Wallet connected:", wallet);

        const swapper = Factory.newSwapper({
          chains: {
            STARKNET: {
              rpcUrl: starknetRpcProvider,
            },
          },
          bitcoinNetwork: BitcoinNetwork.TESTNET4,
        });
        await swapper.init();

        const swapLimits = swapper.getSwapLimits(BTC_TOKEN, STARKNET_TOKEN);
        console.log(
          "Swap Limits, input min: " +
            swapLimits.input.min +
            " input max: " +
            swapLimits.input.max,
        ); // Immediately available
        console.log(
          "Swap Limits, output min: " +
            swapLimits.output.min +
            " output max: " +
            swapLimits.output.max,
        ); // Available after swap rejected due to too low/high amounts

        const _exactIn = true; //exactIn = true, so we specify the input amount
        const _amount = 3000n; // 3000 sats (0.00003 BTC)

        console.log("wallet address", wallet.account.address);
        // Create swap quote
        const swap = await swapper.swap(
          BTC_TOKEN, // Swap from BTC
          STARKNET_TOKEN, // Into STRK
          _amount,
          _exactIn,
          undefined, // Source address for the swaps, not used for swaps from BTC
          destinationSmartchainWallet, // Destination address.
        );

        // Relevant data created about the swap
        console.log("Swap created: " + swap.getId() + ":"); // Unique swap ID
        console.log("   Input: " + swap.getInputWithoutFee()); // Input amount excluding fee
        console.log("    Fees: " + swap.getFee().amountInSrcToken); // Fees paid on the output
        for (let fee of swap.getFeeBreakdown()) {
          console.log(
            "     - " + FeeType[fee.type] + ": " + fee.fee.amountInSrcToken,
          ); // Fees paid on the output
        }
        console.log("     Input with fees: " + swap.getInput()); // Total amount paid including fees
        console.log("     Output: " + swap.getOutput()); // Output amount
        console.log(
          "     Quote expiry: " +
            swap.getQuoteExpiry() +
            " (in " +
            (swap.getQuoteExpiry() - Date.now()) / 1000 +
            " seconds)",
        ); // Quote expiry timestamp
        console.log("     Price:"); // Pricing Information
        console.log("       - swap: " + swap.getPriceInfo().swapPrice); // Price of the current swap (excluding fees)
        console.log("       - market: " + swap.getPriceInfo().marketPrice); // Current Market price
        console.log("       - difference: " + swap.getPriceInfo().difference); // Difference between swap price and the current market price
        console.log(
          "     Minimum bitcoin transaction fee rate " +
            swap.minimumBtcFeeRate +
            " sats/vB",
        ); // Minimum fee rate of the bitcoin transaction

        // Add a listener for swap state changes
        swap.events.on("swapState", (swap) => {
          console.log(
            "Swap " +
              swap.getId() +
              " changed state to " +
              SpvFromBTCSwapState[swap.getState()],
          );
        });

        // Obtain the funded PSBT (input already added) - ready for signing
        const { psbt, signInputs } = await swap.getFundedPsbt({
          address: paymentAddressItem?.address as string,
          publicKey: paymentAddressItem?.publicKey as string, // Public key for P2WPKH or P2TR outputs
        });

        console.log("psbt", psbt);
        console.log("signInputs", signInputs);

        const psbtBase64 = Buffer.from(psbt.toPSBT()).toString("base64");
        const res: RpcResult<"signPsbt"> = await request("signPsbt", {
          psbt: psbtBase64,
        });
        const anyResponse = res as any;
        const signResponse: SignPsbtResult = anyResponse[
          "result"
        ] as SignPsbtResult;

        console.log("signResponse", signResponse);

        const transaction = Transaction.fromPSBT(
          Buffer.from(signResponse.psbt, "base64"),
        );
        console.log("transaction", transaction);
        const bitcoinTxId = await swap.submitPsbt(transaction);
        console.log("Bitcoin transaction sent: " + bitcoinTxId);

        await swap.waitForBitcoinTransaction(
          (txId, confirmations, targetConfirmations, transactionETAms) => {
            if (txId == null) {
              return;
            }

            console.log(
              "Swap transaction " +
                txId +
                " (" +
                confirmations +
                "/" +
                targetConfirmations +
                ") ETA: " +
                transactionETAms / 1000 +
                "s",
            );
          },
          5,
          undefined,
        );
      } else {
        if (response.error.code == RpcErrorCode.USER_REJECTION) {
          console.error("User rejected wallet connection.", response.error);
        } else {
          console.error("Failed to connect to Xverse Wallet:", response.error);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div>
      <div className="min-h-screen flex items-center justify-center bg-main relative">
        {/* background glow */}
        <div className="circle-gradient-dark" />
        <div className="circle-gradient-blue-dark" />

        <div className="w-full max-w-sm md:max-w-md p-6 sm:p-8 rounded-2xl bg-component border-gradient shadow-lg backdrop-blur-lg">
          <h1 className="text-center text-2xl font-semibold mb-6 text-function">
            Swap BTC for STRK
          </h1>

          {/* From section */}
          <div className="mb-4">
            <label className="block text-sm mb-2">From</label>
            <div className="flex items-center bg-input rounded-xl px-3 py-2">
              <input
                type="number"
                // value={btcAmount}
                // onChange={(e) => setBtcAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent focus:outline-none text-base-content placeholder-gray-400"
              />
              <div className="flex items-center gap-2 font-semibold">
                <img src="/btc.svg" alt="BTC" className="w-5 h-5" />
                <span>BTC</span>
              </div>
            </div>
          </div>

          {/* Arrow separator */}
          <div className="flex justify-center my-4">
            <div className="bg-function p-2 rounded-full cursor-pointer hover:scale-110 transition-transform">
              {/* <ArrowDownUp size={18} /> */}
            </div>
          </div>

          {/* To section */}
          <div className="mb-6">
            <label className="block text-sm mb-2">To</label>
            <div className="flex items-center bg-input rounded-xl px-3 py-2">
              <input
                type="number"
                // value={strkAmount}
                // onChange={(e) => setStrkAmount(e.target.value)}
                disabled
                placeholder="0.00"
                className="flex-1 bg-transparent focus:outline-none text-base-content placeholder-gray-400"
              />
              <div className="flex items-center gap-2 font-semibold">
                <img src="/strk.svg" alt="STRK" className="w-5 h-5" />
                <span>STRK</span>
              </div>
            </div>
          </div>

          {/* Swap details section */}
          <div className="mt-6 border-t border-base-200 pt-4">
            <button
              className="flex items-center justify-between w-full text-left text-sm text-function font-semibold"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span>Swap Details</span>
              {/* {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />} */}
            </button>

            {showDetails && (
              <div className="mt-4 text-sm space-y-2 text-base-content bg-input rounded-xl p-4">
                <p>
                  <strong>ID:</strong> {mockSwap.getId()}
                </p>
                <p>
                  <strong>Input (no fee):</strong>{" "}
                  {mockSwap.getInputWithoutFee()}
                </p>
                <p>
                  <strong>Fees:</strong> {mockSwap.getFee().amountInSrcToken}
                </p>

                <div className="pl-3">
                  {mockSwap.getFeeBreakdown().map((fee, i) => (
                    <p key={i}>
                      - {FeeType[fee.type as keyof typeof FeeType] || fee.type}:{" "}
                      {fee.fee.amountInSrcToken}
                    </p>
                  ))}
                </div>

                <p>
                  <strong>Total Input (with fees):</strong>{" "}
                  {mockSwap.getInput()}
                </p>
                <p>
                  <strong>Output:</strong> {mockSwap.getOutput()}
                </p>
                <p>
                  <strong>Quote Expiry:</strong>{" "}
                  {new Date(mockSwap.getQuoteExpiry()).toLocaleTimeString()} (
                  {Math.round((mockSwap.getQuoteExpiry() - Date.now()) / 1000)}s
                  left)
                </p>

                <div className="pt-2">
                  <p className="font-semibold text-function">Price Info:</p>
                  <p>- Swap: {mockSwap.getPriceInfo().swapPrice}</p>
                  <p>- Market: {mockSwap.getPriceInfo().marketPrice}</p>
                  <p>- Difference: {mockSwap.getPriceInfo().difference}</p>
                </div>

                <p className="pt-2">
                  <strong>Min BTC Fee Rate:</strong>{" "}
                  {mockSwap.minimumBtcFeeRate} sats/vB
                </p>
              </div>
            )}
          </div>

          {/* Swap button */}
          <button
            onClick={() => swapTokens()}
            disabled={false}
            className="w-full btn bg-btn-wallet text-primary-content font-semibold border-none py-3 rounded-full hover:opacity-90 transition-all"
          >
            Swap
          </button>

          {/* Wallet/network info */}
          <div className="mt-6 text-center text-sm text-neutral-content">
            <div className="flex justify-center items-center gap-2 mb-2">
              {/* <Wallet size={16} /> */}
              <span>Connect wallet to continue</span>
            </div>
            <span className="text-network">Network: Bitcoin → Starknet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
