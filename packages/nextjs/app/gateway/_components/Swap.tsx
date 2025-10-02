"use client";

import {
  RpcProviderWithRetries,
  StarknetInitializer,
  StarknetInitializerType,
  StarknetSigner,
} from "@atomiqlabs/chain-starknet";
import { BitcoinNetwork, FeeType, SpvFromBTCSwapState, SwapperFactory } from "@atomiqlabs/sdk";
import { connect } from "@starknet-io/get-starknet";
import { AddressPurpose, request, RpcErrorCode, RpcResult, SignPsbtResult } from "sats-connect";
import { Account, Signer } from "starknet";

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

      let swo = await connect();
      if (!swo) {
        console.error("Xverse Wallet not found. Please install the Xverse Wallet extension.");
        return;
      }

      const response = await request("wallet_connect", {
        addresses: [AddressPurpose.Ordinals, AddressPurpose.Payment, AddressPurpose.Stacks, AddressPurpose.Starknet, AddressPurpose.Spark]
      });

      console.log(response);

      if (response.status == "success") {
        const paymentAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment,
        );

        console.log("paymentAddressItem: ", paymentAddressItem);

        const x = swo as any;
        let destinationSmartchainWallet = x['selectedAddress'];
        console.log('selectedAddress', x['selectedAddress']);

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

        console.log("wallet address", wallet.account.address);
        // Create swap quote
        const swap = await swapper.swap(
          BTC_TOKEN, // Swap from BTC
          STARKNET_TOKEN, // Into STRK
          _amount,
          _exactIn,
          undefined, // Source address for the swaps, not used for swaps from BTC
          destinationSmartchainWallet // Destination address.
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
          address: paymentAddressItem?.address as string,
          publicKey: paymentAddressItem?.publicKey as string, // Public key for P2WPKH or P2TR outputs
        });

        console.log('psbt', psbt);
        console.log('signInputs', signInputs);

        const psbtBase64 = Buffer.from(psbt.toPSBT()).toString('base64');
        const res: RpcResult<'signPsbt'> = await request('signPsbt', {
          psbt: psbtBase64,
        });
        const anyResponse = res as any;
        const signResponse: SignPsbtResult = anyResponse['result'] as SignPsbtResult;

        console.log('signResponse', signResponse);

        for(let signIdx of signInputs) {
          psbt.signIdx(new Signer(), signIdx); //Or pass it to external signer
        }

        const bitcoinTxId = await swap.submitPsbt(psbt);
        console.log("Bitcoin transaction sent: "+bitcoinTxId);

        await swap.waitForBitcoinTransaction((txId, confirmations, targetConfirmations, transactionETAms) => {
          if (txId == null) {
            return;
          }
          
          console.log("Swap transaction "+txId+" ("+confirmations+"/"+targetConfirmations+") ETA: "+(transactionETAms/1000)+"s");
        }, 5, undefined);
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
