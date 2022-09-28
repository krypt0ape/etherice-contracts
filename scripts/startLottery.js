async function startLottery(){
    const BiggestBuy = await ethers.getContractFactory("EthericeBiggestBuy");
    const biggestBuyContract = await BiggestBuy.attach('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0')
    await biggestBuyContract.doStartComp("0x5FbDB2315678afecb367f032d93F642f64180aa3");
}

  
startLottery()
.then(async () => {
    process.exit(0)
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});