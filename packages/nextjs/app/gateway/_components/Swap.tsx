"use client";

import {
  RpcProviderWithRetries,
  StarknetChainType,
  StarknetInitializer,
  StarknetInitializerType,
  StarknetSigner,
} from "@atomiqlabs/chain-starknet";
import {
  BitcoinNetwork,
  FeeType,
  SpvFromBTCSwap,
  SpvFromBTCSwapState,
  SwapperFactory,
} from "@atomiqlabs/sdk";
import { Transaction } from "@scure/btc-signer/transaction";
import { connect } from "@starknet-io/get-starknet";
import { set } from "nprogress";
import { useEffect, useState } from "react";
import {
  AddressPurpose,
  AddressType,
  request,
  RpcErrorCode,
  RpcResult,
  SignPsbtResult,
} from "sats-connect";
import { Account, Signer } from "starknet";
import { Wallet, ChevronDown, ChevronUp } from "lucide-react";

export function Swap() {
  const [strkAddress, setStrkAddress] = useState("");
  let [swap, setSwapObject] = useState<
    SpvFromBTCSwap<StarknetChainType> | undefined
  >(undefined);
  const [paymentAddressItem, setPaymentAddressItem] = useState<
    | {
        address: string;
        publicKey: string;
        purpose: AddressPurpose;
        addressType: AddressType;
        walletType: "software" | "ledger" | "keystone";
      }
    | undefined
  >(undefined);
  const [swapId, setswapId] = useState("");
  const [inputTokenWithoutFee, setInputTokenWithoutFee] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [swapFees, setSwapFees] = useState(0);
  const [networkOutputFee, setNetworkOutputFees] = useState(0);
  const [totalInputWithFee, setTotalInputWithFee] = useState(0);
  const [output, setOutput] = useState(0);
  const [quoteExpiryInSeconds, setQuoteExpiryInDeconds] = useState(0);
  const [priceOfSwapExcludingFees, setPriceOfSwapExcludingFees] = useState(0);
  const [currentMarketPrice, setCurrentMarketPrice] = useState(0);
  const [priceDifference, setPriceDifference] = useState(0);
  const [minimumBtcFeeRate, setMinimumBtcFeeRate] = useState(0);
  const [btcAmt, setBtcAmt] = useState<string>("");
  const [btcAmtInSats, setbtcAmtInSats] = useState<bigint>(0n);
  const [usdValue, setUsdValue] = useState<number>(0);

  // Update USD equivalent whenever BTC value changes
  useEffect(() => {
    if (!btcAmt) return;
    const btc = parseFloat(btcAmt.toString());
    setUsdValue(btc * 111179.6); // Example conversion rate
    setSwapDetailsGenerated(false);
  }, [btcAmt]);

  const handleBTCInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBtcAmt(value);

    // Handle empty input
    if (value === "") {
      setbtcAmtInSats(0n);
      return;
    }

    try {
      const sats = BigInt(Math.round(parseFloat(value) * 100_000_000));
      setbtcAmtInSats(sats);
    } catch {
      console.warn("Invalid bigint input:", value);
      // Optionally keep old value or reset
    }
  };

  const [showDetails, setShowDetails] = useState(false);
  const [swapDetailsGenerated, setSwapDetailsGenerated] = useState(false);

  const generateSwapDetails = async () => {
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
        setPaymentAddressItem(paymentAddressItem);

        const starknetAddress = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Starknet,
        );

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
        // const _amount = 3000n; // 3000 sats (0.00003 BTC)

        console.log("wallet address", wallet.account.address);
        // Create swap quote
        swap = await swapper.swap(
          BTC_TOKEN, // Swap from BTC
          STARKNET_TOKEN, // Into STRK
          btcAmtInSats,
          _exactIn,
          undefined, // Source address for the swaps, not used for swaps from BTC
          strkAddress,
        );
        setSwapObject(swap);

        // Relevant data created about the swap
        const swapId = swap.getId();
        console.log("Swap created: " + swapId + ":"); // Unique swap ID
        setswapId(swapId);

        const inputTokenWithoutFee = swap.getInputWithoutFee()._amount;
        console.log("   Input: " + inputTokenWithoutFee); // Input amount excluding fee
        setInputTokenWithoutFee(inputTokenWithoutFee);

        const totalFees = swap.getFee().amountInSrcToken._amount;
        console.log("    Fees: " + totalFees); // Fees paid on the output
        setTotalFees(totalFees);

        let swapFee = 0;
        let networkOutputFee = 0;
        for (let fee of swap.getFeeBreakdown()) {
          if (fee.type === FeeType.SWAP) {
            swapFee = fee.fee.amountInSrcToken._amount;
            console.log("     - " + FeeType[fee.type] + ": " + swapFee); // Fees paid on the output
            setSwapFees(swapFee);
          } else if (fee.type === FeeType.NETWORK_OUTPUT) {
            networkOutputFee += fee.fee.amountInSrcToken._amount;
            console.log(
              "     - " + FeeType[fee.type] + ": " + networkOutputFee,
            ); // Fees paid on the output
            setNetworkOutputFees(networkOutputFee);
          }
        }

        const totalInputWithFee = swap.getInput()._amount;
        console.log("     Input with fees: " + totalInputWithFee); // Total amount paid including fees
        setTotalInputWithFee(totalInputWithFee);

        const output = swap.getOutput()._amount;
        console.log("     Output: " + output + " STRK"); // Output amount
        setOutput(output);

        const quoteExpiryInSeconds =
          (swap.getQuoteExpiry() - Date.now()) / 1000;
        console.log(
          "     Quote expiry: " +
            swap.getQuoteExpiry() +
            " (in " +
            quoteExpiryInSeconds +
            " seconds)",
        ); // Quote expiry timestamp
        setQuoteExpiryInDeconds(quoteExpiryInSeconds);

        console.log("     Price:"); // Pricing Information

        const priceOfSwapExcludingFees = swap.getPriceInfo().swapPrice;
        console.log("       - swap: " + priceOfSwapExcludingFees); // Price of the current swap (excluding fees)
        setPriceOfSwapExcludingFees(priceOfSwapExcludingFees);

        const currentMarketPrice = swap.getPriceInfo().marketPrice;
        console.log("       - market: " + currentMarketPrice); // Current Market price
        setCurrentMarketPrice(currentMarketPrice);

        const priceDifference = swap.getPriceInfo().difference.decimal;
        console.log("       - difference: " + priceDifference); // Difference between swap price and the current market price
        setPriceDifference(priceDifference);

        const minimumBtcFeeRate = swap.minimumBtcFeeRate;
        console.log(
          "     Minimum bitcoin transaction fee rate " +
            minimumBtcFeeRate +
            " sats/vB",
        ); // Minimum fee rate of the bitcoin transaction
        setMinimumBtcFeeRate(minimumBtcFeeRate);

        setSwapDetailsGenerated(true);
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

  const swapTokens = async () => {
    try {
      if (!swap) {
        console.error("No swap object available.");
        return;
      }

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
      if (!swap) {
        console.error("No swap object available.");
        return;
      }

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
            {/* Optional live preview */}
            <div className="text-sm text-gray-500">
              sats: <code>{btcAmtInSats.toString()}</code>, USD:{" "}
              <code>{usdValue.toFixed(2)}</code>
            </div>
            <div className="flex items-center bg-input rounded-xl px-3 py-2">
              <input
                type="number"
                value={btcAmt}
                onChange={handleBTCInputChange}
                placeholder="0.00"
                className="flex-1 bg-transparent focus:outline-none text-base-content placeholder-gray-400"
              />
              <div className="flex items-center gap-2 font-semibold">
                <img src="/btc.svg" alt="BTC" className="w-5 h-5" />
                <span>BTC</span>
              </div>
            </div>
          </div>

          {/* To section */}
          {swapDetailsGenerated && (
            <div className="mb-6">
              <label className="block text-sm mb-2">To</label>
              <div className="flex items-center bg-input rounded-xl px-3 py-2">
                <input
                  type="number"
                  value={output}
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
          )}

          <div className="mb-6">
            <label className="block text-sm mb-2">Address</label>
            <div className="flex items-center bg-input rounded-xl px-3 py-2">
              <input
                type="text"
                value={strkAddress}
                onChange={(e) => setStrkAddress(e.target.value)}
                placeholder="0x123...abc"
                className="flex-1 bg-transparent focus:outline-none text-base-content placeholder-gray-400"
              />
            </div>
          </div>

          {/* Swap details section */}
          {swapDetailsGenerated && (
            <div className="mt-6 mb-3 border-t border-base-200 pt-4">
              <button
                className="flex items-center justify-between w-full text-left text-sm text-function font-semibold"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>Swap Details</span>
                {showDetails ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>

              {showDetails && (
                <div className="mt-4 text-sm space-y-2 text-base-content bg-input rounded-xl p-4">
                  <p className="break-all">
                    <strong>ID:</strong> {swapId}
                  </p>
                  <p>
                    <strong>Input (no fee):</strong> {inputTokenWithoutFee}
                  </p>
                  <p>
                    <strong>Fees:</strong> {totalFees}
                  </p>

                  <div className="pl-3">
                    <p>- Swap: {swapFees}</p>
                    <p>- Network: {networkOutputFee}</p>
                  </div>

                  <p>
                    <strong>Total Input (with fees):</strong>{" "}
                    {totalInputWithFee}
                  </p>
                  <p>
                    <strong>Output:</strong> {output} STRK
                  </p>
                  <p>
                    <strong>Quote Expiry:</strong>{" "}
                    {quoteExpiryInSeconds.toFixed(0)} seconds
                  </p>

                  <div className="pt-2">
                    <p className="font-semibold text-function">Price Info:</p>
                    <p>- Swap: {priceOfSwapExcludingFees}</p>
                    <p>- Market: {currentMarketPrice}</p>
                    <p>- Difference: {priceDifference}</p>
                  </div>

                  <p className="pt-2">
                    <strong>Min BTC Fee Rate:</strong> {minimumBtcFeeRate}{" "}
                    sats/vB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Swap button */}
          {!swapDetailsGenerated && (
            <button
              onClick={() => generateSwapDetails()}
              disabled={false}
              className="w-full btn bg-btn-wallet text-primary-content font-semibold border-none py-3 rounded-full hover:opacity-90 transition-all"
            >
              Generate Swap Details
            </button>
          )}

          {swapDetailsGenerated && (
            <button
              onClick={() => swapTokens()}
              disabled={false}
              className="w-full btn bg-btn-wallet text-primary-content font-semibold border-none py-3 rounded-full hover:opacity-90 transition-all"
            >
              Swap
            </button>
          )}

          {/* Wallet/network info */}
          <div className="mt-6 text-center text-sm text-neutral-content">
            <div className="flex justify-center items-center gap-2 mb-2">
              <Wallet size={16} />
            </div>
            <span className="text-network">Network: Bitcoin → Starknet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
