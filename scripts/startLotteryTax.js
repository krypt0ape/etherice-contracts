async function startLotteryTax(){
    const Token = await ethers.getContractFactory("EthericeToken");
    const tokenContract = await Token.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3')
    await tokenContract.updateTaxes(4, 1, 1, 1, 1);
}

  
startLotteryTax()
.then(async () => {
    process.exit(0)
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});