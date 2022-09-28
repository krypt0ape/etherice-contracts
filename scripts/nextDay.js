const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function nextDay() {
    const Token = await ethers.getContractFactory("EthericeToken");
    const token = await Token.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3')
    await helpers.time.increase( 3600 * 24 ); 
    await token.doDailyUpdate(); 
}

nextDay()
.then(()=>process.exit(0))
.catch(err => {
    console.error(err)
    process.exit(1)
})