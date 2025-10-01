"use client";

import {
  RpcProviderWithRetries,
  StarknetInitializer,
  StarknetInitializerType,
} from "@atomiqlabs/chain-starknet";
import { BitcoinNetwork, FeeType, fromHumanReadableString, SpvFromBTCSwapState, SwapperFactory } from "@atomiqlabs/sdk";

export function Swap() {
  const swapTokens = async () => {
    try {
      const Factory = new SwapperFactory<[StarknetInitializerType]>([
        StarknetInitializer,
      ] as const);
      const Tokens = Factory.Tokens;
      const BTC_TOKEN = Tokens.BITCOIN.BTC
      const STARKNET_TOKEN = Tokens.STARKNET.STRK;
      const nodeUrl = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";
      const starknetRpcProvider = new RpcProviderWithRetries({
        nodeUrl,
      });

      const swapper = Factory.newSwapper({
        chains: {
          STARKNET: {
            rpcUrl: starknetRpcProvider,
          },
        },
        bitcoinNetwork: BitcoinNetwork.TESTNET4,
      });

      const swapLimits = swapper.getSwapLimits(
        BTC_TOKEN,
        STARKNET_TOKEN,
      );
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

      // Create swap quote
      const swap = await swapper.swap(
        BTC_TOKEN, // Swap from BTC
        STARKNET_TOKEN, // Into STRK
        _amount,
        _exactIn,
        undefined, // Source address for the swaps, not used for swaps from BTC
        "0x067b71c52c128cc94e466abd4b793fc02669bbd4336d9881a98c3aad83d3f710" // Destination address. TODO: Collect from user
      );

      // Relevant data created about the swap
      console.log("Swap created: " + swap.getId() + ":"); // Unique swap ID
      console.log("   Input: " + swap.getInputWithoutFee()); // Input amount excluding fee
      console.log("    Fees: " + swap.getFee().amountInSrcToken); // Fees paid on the output
      for (let fee of swap.getFeeBreakdown()) {
        console.log("     - " +  FeeType[fee.type] + ": " + fee.fee.amountInSrcToken); // Fees paid on the output
      }
      console.log("     Input with fees: " + swap.getInput()); // Total amount paid including fees
      console.log("     Output: " + swap.getOutput()); // Output amount
      console.log("     Quote expiry: " + swap.getQuoteExpiry()+ " (in " + (swap.getQuoteExpiry()-Date.now())/1000 + " seconds)"); // Quote expiry timestamp
      console.log("     Price:"); // Pricing Information
      console.log("       - swap: " + swap.getPriceInfo().swapPrice); // Price of the current swap (excluding fees)
      console.log("       - market: " + swap.getPriceInfo().marketPrice); // Current Market price
      console.log("       - difference: " + swap.getPriceInfo().difference); // Difference between swap price and the current market price
      console.log("     Minimum bitcoin transaction fee rate " + swap.minimumBtcFeeRate + " sats/vB"); // Minimum fee rate of the bitcoin transaction

      // Add a listener for swap state changes
      swap.events.on("swapState", (swap) => {
        console.log("Swap " + swap.getId() + " changed state to " + SpvFromBTCSwapState[swap.getState()]);
      });

      // Obtain the funded PSBT (input already added) - ready for signing
      const { psbt, signInputs } = await swap.getFundedPsbt({
        address: "",
        publicKey: "", // Public key for P2WPKH or P2TR outputs
      });

    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div>
      <div>Swap Component</div>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <button
          onClick={() => swapTokens()}
          disabled={false}
          className="rounded-[18px] btn-sm  font-bold px-8 bg-btn-wallet py-3 cursor-pointer"
        >
          Swap BTC to STRK
        </button>
      </div>
    </div>
  );
}
