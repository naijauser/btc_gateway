"use client";
import React, { useState } from "react";
import { AddressPurpose, request, RpcErrorCode } from "sats-connect";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { Swap } from "./Swap";
import { connect, StarknetWindowObject } from "@starknet-io/get-starknet";
import { useLocalStorage } from "usehooks-ts";
import { StarknetSigner } from "@atomiqlabs/chain-starknet";
import { Account } from "starknet";

// This is a placeholder component for connecting to the Xverse wallet.
// You will need to implement the actual connection logic using the Xverse SDK or API.

export function ConnectXverseWallet() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setWalletAccount] = useLocalStorage<Account | null>("walletAccount", null);

  const connectWallet = async () => {
    console.log("Connecting to Xverse Wallet...");

    try {
      let swo = await connect();
      if (!swo) {
        console.error("Xverse Wallet not found. Please install the Xverse Wallet extension.");
        return;
      }

      // const wallet = new StarknetSigner(x);

      const response = await request("wallet_connect", {
        addresses: [AddressPurpose.Ordinals, AddressPurpose.Payment, AddressPurpose.Stacks, AddressPurpose.Starknet, AddressPurpose.Spark]
      });
      console.log(response);
      if (response.status == "success") {
        setWalletConnected(true);
        const paymentAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment,
        );
        const ordinalsAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Ordinals,
        );
        const stacksAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Stacks,
        );
        const starknetAddressItem = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Starknet,
        );

        console.log("paymentAddressItem: ", paymentAddressItem);
        console.log("ordinalsAddressItem: ", ordinalsAddressItem);
        console.log("stacksAddressItem: ", stacksAddressItem);
        console.log("starknetAddressItem: ", starknetAddressItem);
      } else {
        if (response.error.code == RpcErrorCode.USER_REJECTION) {
          console.error("User rejected wallet connection.", response.error);
        } else {
          console.error("Failed to connect to Xverse Wallet:", response.error);
        }
      }
    } catch (e) {
      console.error("Error connecting to Xverse Wallet:", e);
    }

    const balanceResponse = await request("getBalance", undefined);

    if (balanceResponse.status === "success") {
      console.log(balanceResponse.result);
    } else {
      console.error(balanceResponse.error);
    }
  };

  return (
    <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
      <div className="flex items-center space-x-2">
        {walletConnected ? (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <AddressInfoDropdown
              address={"0x"}
              blockExplorerAddressLink={undefined}
              displayName={""}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <button
              onClick={() => connectWallet()}
              disabled={false}
              className="rounded-[18px] btn-sm  font-bold px-8 bg-btn-wallet py-3 cursor-pointer"
            >
              Connect Xverse Wallet
            </button>
          </div>
        )}
      </div>
      <Swap />
    </div>
  );
}
