import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractConfig";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  chainId: string | null;
  isConnected: boolean;
  isOwner: boolean;
  contract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize Web3 Connection
  const initWeb3 = async (requestConnect: boolean = false) => {
    if (typeof window.ethereum === "undefined") {
      setError("MetaMask no esta instalado. Instala MetaMask para interactuar.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if already authorized or requested
      let accounts: string[] = [];
      if (requestConnect) {
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      } else {
        accounts = await window.ethereum.request({ method: "eth_accounts" });
      }

      if (accounts.length > 0) {
        const activeAccount = accounts[0];
        setAccount(activeAccount);
        setIsConnected(true);

        const chain = await window.ethereum.request({ method: "eth_chainId" });
        setChainId(chain);

        // Setup Ethers provider & signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Instantiate contract
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contractInstance);

        // Check if owner
        try {
          const ownerAddress = await contractInstance.owner();
          setIsOwner(ownerAddress.toLowerCase() === activeAccount.toLowerCase());
        } catch (ownerErr) {
          console.error("Error checking contract owner:", ownerErr);
          setIsOwner(false);
        }
      } else {
        setAccount(null);
        setIsConnected(false);
        setContract(null);
        setIsOwner(false);
      }
    } catch (err: any) {
      console.error("Web3 initialization error:", err);
      setError(err.message || "Error al conectar con MetaMask");
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    await initWeb3(true);
  };

  useEffect(() => {
    // Try to auto-connect on load
    initWeb3(false);

    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length > 0) {
          initWeb3(false);
        } else {
          setAccount(null);
          setIsConnected(false);
          setContract(null);
          setIsOwner(false);
        }
      };

      const handleChainChanged = (chain: string) => {
        console.log("Chain changed:", chain);
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        isConnected,
        isOwner,
        contract,
        connectWallet,
        error,
        isLoading,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
