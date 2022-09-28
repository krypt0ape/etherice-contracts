async function deploy() {
  const [owner, wallet1, wallet2, wallet3, wallet4, wallet5, marketingWallet, devWallet, buybackWallet, rewardsWallet] = await ethers.getSigners();
  
    console.log("Deploying Token Contract");
    const Token = await ethers.getContractFactory("EthericeToken");
    const tokenContract = await Token.deploy();
    await tokenContract.deployed();
    console.log("Token CA:", tokenContract.address);

    console.log("Deploying Staking Contract");
    const Staking = await ethers.getContractFactory("EthericeStaking");
    const stakingContract = await Staking.deploy();
    await stakingContract.deployed();
    console.log("Staking CA:", stakingContract.address);
    
    console.log("Deploying Biggest Buy Contract");
    const BiggestBuy = await ethers.getContractFactory("EthericeBiggestBuy");
    const biggestBuyContract = await BiggestBuy.deploy();
    await biggestBuyContract.deployed();
    console.log("Biggest Buy CA:", biggestBuyContract.address);
    
    console.log("Setting up Contract links...");
    await stakingContract.setTokenContractAddress(tokenContract.address);
    await tokenContract.updateDevAddress(devWallet.address);
    await tokenContract.updateMarketingAddress(marketingWallet.address);
    await tokenContract.updateBuybackAddress(buybackWallet.address);
    await tokenContract.updateRewardsAddress(rewardsWallet.address);
    console.log("Deployment Complete!");
  }

  
  deploy()
    .then(async () => {
        process.exit(0)
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });