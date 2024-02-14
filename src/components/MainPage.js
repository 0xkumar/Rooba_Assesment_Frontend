import React, { useState } from "react";
import { FACTORY_CONTRACT, FACTORY_ABI, WALLET_ABI } from "./constants";
const ethers = require('ethers');


function MainPage() {
  const [funds, setFunds] = useState("");
  const [loading, setLoading] = useState(false);
  const [WalletNotFound, SetWalletNotFound] = useState(false);
  const [result, setResult] = useState("");
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [provider, setProvider] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);
  const [createdContractAddress, setCreatedContractAddress] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState("");

  const [targetAddress, setTargetAddress] = useState("");
  const [targetFunctionSignature, setTargetFunctionSignature] = useState("");
  const [targetFunctionParams, setTargetFunctionParams] = useState([]);
  const [paramValue, setParamValue] = useState("");

  const addParameter = () => {
    setTargetFunctionParams([...targetFunctionParams, paramValue]);
  };

  const removeParameter = (index) => {
    const updatedParams = [...targetFunctionParams];
    updatedParams.splice(index, 1);
    setTargetFunctionParams(updatedParams);
  };

  function disconnectWallet() {
    setCurrentAction("connect");
    setConnectedWallet(null);
  }

  async function createSmartWallet() {
    setCurrentAction("create");
    setLoading(true);

    if (!checkWalletConenction()) {
      return;
    }

    const contract = new ethers.Contract(
      FACTORY_CONTRACT,
      FACTORY_ABI,
      provider.getSigner()
    );
    try {
      const transactionResponse = await contract.createSmartWallet();
      const transactionReceipt = await listenForTransactionMine(
        transactionResponse,
        provider
      );
      const contractAddress = transactionReceipt.logs[0].topics[2];
      setCreatedContractAddress(contractAddress);
      setResult(`Smart Wallet created at address: ${contractAddress}`);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  function listenForTransactionMine(transactionResponse) {
    return new Promise((resolve, reject) => {
      provider.once(transactionResponse.hash, (transactionReceipt) => {
        console.log(
          `Completed with ${transactionReceipt.confirmations} confirmations. `
        );
        console.log(transactionReceipt);
        console.log(transactionResponse);
        resolve(transactionReceipt);
      });
    });
  }

  async function checkSmartWallet() {
    return new Promise(async (resolve, reject) => {
      console.log(createdContractAddress);
      if (createdContractAddress === null) {
        try {
          const contract = new ethers.Contract(
            FACTORY_CONTRACT,
            FACTORY_ABI,
            provider.getSigner()
          );
          const transactionResponse = await contract.getWalletAddress();
          setCreatedContractAddress(transactionResponse);
          resolve(true);
        } catch (error) {
          console.log(error);
          setResult(
            "Smart Wallet not created yet. Please create a wallet first."
          );
          setLoading(false);
          reject(false);
        }
      }
      resolve(true);
    });
  }

  async function destroySmartWallet() {
    setCurrentAction("destroy");
    setLoading(true);
    if (!checkWalletConenction()) {
      return;
    }
    const contract = new ethers.Contract(
      FACTORY_CONTRACT,
      FACTORY_ABI,
      provider.getSigner()
    );
    try {
      const transactionResponse = await contract.destroySmartWallet();
      await listenForTransactionMine(transactionResponse);
      setResult("Smart Wallet destroyed");
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  async function addFunds() {
    setCurrentAction("add");
    setLoading(true);

    try {
      if (!checkWalletConenction()) {
        return;
      }

      const isSmartWalletCreated = await checkSmartWallet();

      if (!isSmartWalletCreated) {
        setLoading(false);
        setFunds("");
        console.log(createdContractAddress);
        console.log(
          "Smart Wallet not created yet. Please create a wallet first."
        );
        return;
      }

      const amountToSend = ethers.utils.parseUnits(funds, "wei");
      const gasPrice = await provider.getGasPrice();
      const gasLimit = 21000;

      const transaction = {
        to: createdContractAddress,
        value: amountToSend,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
      };

      const transactionResponse = await provider
        .getSigner()
        .sendTransaction(transaction);

      await listenForTransactionMine(transactionResponse);
      setResult("Funds Added");
    } catch (error) {
      console.log(error);
    }

    setLoading(false);
    setFunds("");
  }

  function checkWalletConenction() {
    if (!connectedWallet) {
      setResult("Please connect your wallet first!");
      setLoading(false);
      return false;
    }
    return true;
  }

  async function connectWallet() {
    setCurrentAction("connect");
    setLoading(true);

    if (typeof window.ethereum !== "undefined") {
      await RequestAccount();
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(newProvider);
      const signer = newProvider.getSigner();
      const address = await signer.getAddress();
      const balance = await signer.getBalance();

      setConnectedWallet({ address, balance });
    } else {
      console.log("Metamask not detected");
      SetWalletNotFound(true);
    }

    setLoading(false);
  }

  async function transferFunds() {
    setCurrentAction("transfer");
    setLoading(true);
    try {
      if (!checkWalletConenction()) {
        return;
      }

      const isSmartWalletCreated = await checkSmartWallet();

      if (!isSmartWalletCreated || createdContractAddress === null) {
        setLoading(false);
        setFunds("");
        console.log(createdContractAddress);
        console.log(
          "Smart Wallet not created yet. Please create a wallet first."
        );
        return;
      }

      console.log(createdContractAddress);
      const contract = new ethers.Contract(
        createdContractAddress,
        WALLET_ABI,
        provider.getSigner()
      );
      try {
        const transactionResponse = await contract.sendEther(
          recipientAddress,
          ethers.utils.parseUnits(funds, "wei")
        );
        await listenForTransactionMine(transactionResponse);
        setResult("Funds Transferred");
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
    setFunds("");
  }

  async function recreateWallet() {
    setCurrentAction("recreate");
    setLoading(true);
    if (!checkWalletConenction()) {
      return;
    }
    const contract = new ethers.Contract(
      FACTORY_CONTRACT,
      FACTORY_ABI,
      provider.getSigner()
    );
    try {
      const transactionResponse =
        await contract.destroyAndRecreateSmartWallet();
      const transactionReceipt = await listenForTransactionMine(
        transactionResponse,
        provider
      );
      const contractAddress = transactionReceipt.logs[1].topics[2];
      setCreatedContractAddress(contractAddress);
      console.log(contractAddress);
      setResult(`Smart Wallet created at address: ${contractAddress}`);
      setResult("Smart Wallet recreated");
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  async function RequestAccount() {
    if (window.ethereum) {
      console.log("detected");
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      } catch (error) {
        console.log("Error connecting");
      }
    } else {
      console.log("Not detected");
    }
  }

  async function delegateCall() {
    setCurrentAction("delegateCall");
    setLoading(true);
    if (!checkWalletConenction()) {
      return;
    }

    const isSmartWalletCreated = await checkSmartWallet();

    if (!isSmartWalletCreated || createdContractAddress === null) {
      setLoading(false);
      setFunds("");
      console.log(createdContractAddress);
      console.log(
        "Smart Wallet not created yet. Please create a wallet first."
      );
      return;
    }

    console.log(createdContractAddress);

    const contract = new ethers.Contract(
      createdContractAddress,
      WALLET_ABI,
      provider.getSigner()
    );
    try {
      const targetFunctionData = encodeTargetFunctionData();
      const transactionResponse = await contract.delegateCallToContract(
        targetAddress,
        targetFunctionData
      );
      await listenForTransactionMine(transactionResponse);
      setResult("Delegate Call executed");
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  function encodeTargetFunctionData() {
    const targetFunction = targetFunctionSignature.split("(")[0];
    const targetParameters = targetFunctionSignature
      .split("(")[1]
      .replace(")", "")
      .split(",");
    console.log(targetFunction);
    console.log(targetParameters);

    const data = ethers.utils.hexConcat([
      ethers.utils.id(targetFunctionSignature),
      ethers.utils.defaultAbiCoder.encode(targetParameters, paramValue)
    ]);
    console.log(data);
    return data;
  }

  return (
    <div>
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-2 col-md-3"></div>
          <div className="col-sm-8 col-md-6 my-5">
            <div
              className="container mt-5 border border-dark rounded p-5"
              id="mainBox"
            >
              <h1 className="mt-2">Smart Wallet</h1>
              <div className="row mt-5">
                <div className="col-6">
                  <button
                    className="btn btn-primary"
                    onClick={createSmartWallet}
                    disabled={loading && currentAction === "create"}
                  >
                    {loading && currentAction === "create"
                      ? "Executing..."
                      : "Create Wallet"}
                  </button>
                </div>
              </div>
              <div className="d-flex flex-col justify-content-start mt-4">
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={addFunds}
                    disabled={loading && currentAction === "add"}
                  >
                    {loading && currentAction === "add"
                      ? "Executing..."
                      : "Add Funds"}
                  </button>
                </div>
                <object hspace="63">
                  <input
                    type="text"
                    placeholder="Amount in Wei"
                    className="p-1"
                    onChange={(event) => setFunds(event.target.value)}
                  />
                </object>
              </div>

              <div className="d-flex flex-col justify-content-start mt-4">
                <div className="mt-4">
                  <h4>Transfer Funds from Smart Wallet</h4>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Target Address"
                      className="form-control"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Amount in Wei"
                      className="form-control"
                      value={funds}
                      onChange={(e) => setFunds(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={transferFunds}
                    disabled={loading && currentAction === "transfer"}
                  >
                    {loading && currentAction === "transfer"
                      ? "Executing..."
                      : "Transfer Funds"}
                  </button>
                </div>
              </div>

              <div className="row mt-4">
                <div className="col-6">
                  <button
                    className="btn btn-primary"
                    onClick={destroySmartWallet}
                    disabled={loading && currentAction === "destroy"}
                  >
                    {loading && currentAction === "destroy"
                      ? "Executing..."
                      : "Destroy Wallet"}
                  </button>
                </div>
              </div>
              <div className="row mt-4">
                <div className="col-6">
                  <button
                    className="btn btn-primary"
                    onClick={recreateWallet}
                    disabled={loading && currentAction === "recreate"}
                  >
                    {loading && currentAction === "recreate"
                      ? "Executing..."
                      : "Recreate Wallet"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3>Delegate Call Inputs</h3>
                <div className="mb-3">
                  <label htmlFor="targetAddress" className="form-label">
                    Target Contract Address:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="targetAddress"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="targetFunctionSignature"
                    className="form-label"
                  >
                    Target Function Signature:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="targetFunctionSignature"
                    value={targetFunctionSignature}
                    onChange={(e) => setTargetFunctionSignature(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="paramValue" className="form-label">
                    Parameter Value:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="paramValue"
                    value={paramValue}
                    onChange={(e) => setParamValue(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" onClick={addParameter}>
                  Add Parameter
                </button>
                <div className="mt-3">
                  <h5>Parameter List:</h5>
                  <ul>
                    {targetFunctionParams.map((param, index) => (
                      <li key={index}>
                        {param}{" "}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeParameter(index)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={delegateCall}
                  disabled={loading && currentAction === "delegateCall"}
                >
                  {loading && currentAction === "delegateCall"
                    ? "Executing..."
                    : "Execute Delegate Call"}
                </button>
              </div>
            </div>
          </div>
          <div className="col-sm-2 col-md-3 mt-2">
            {connectedWallet ? (
              <div>
                <p>Address: {connectedWallet.address.substring(0, 15)}.....</p>
                <p>
                  Balance: {ethers.utils.formatEther(connectedWallet.balance)}{" "}
                  ETH
                </p>
                <button className="btn btn-danger" onClick={disconnectWallet}>
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button
                className="btn btn-success"
                onClick={connectWallet}
                disabled={
                  (loading && currentAction === "connect") || WalletNotFound
                }
              >
                {loading && currentAction === "connect"
                  ? "Executing..."
                  : WalletNotFound
                  ? "Wallet Not Found"
                  : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>
      {result && <div>{result}</div>}
    </div>
  );
}

export default MainPage;