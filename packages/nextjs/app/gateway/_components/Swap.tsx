"use client";

import {
  RpcProviderWithRetries,
  StarknetInitializer,
  StarknetInitializerType,
} from "@atomiqlabs/chain-starknet";
import { BitcoinNetwork, SwapperFactory } from "@atomiqlabs/sdk";

export function Swap() {
  const swapTokens = async () => {
    const Factory = new SwapperFactory<[StarknetInitializerType]>([
      StarknetInitializer,
    ] as const);
    const Tokens = Factory.Tokens;
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
      Tokens.BITCOIN.BTC,
      Tokens.STARKNET.STRK,
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

    // Create swap quote
    const swap = swapper.swap(
      Tokens.BITCOIN.BTC, // Swap from BTC
      Tokens.STARKNET.STRK, // Into STRK
      3000n, // 3000 sats (0.00003 BTC)
      true, // Whether we define an input or output amount
      undefined, // Source address for the swaps, not used for swaps from BTC
      "", // Destination address. TODO: Collect from user
    );
  };

  return <div>Swap Component</div>;
}
