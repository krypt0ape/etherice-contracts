const {
    expect
} = require("chai");
const {
    ethers
} = require("hardhat");
const {
    anyValue
} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const deployContracts = require("../testUtils/deployContracts")
const {fromWei, startAuctionAndGetTokens, toWei, newStake, enterAuction, doDailyUpdate, fastFoward, getEtherBalance} = require("../testUtils/helpers");


describe("Test Stake Trading", function(){
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    describe("Listing Stake for sale", function(){
        it("Creates a stake", async () => {
            const entries = [
                {wallet: wallet1, amount: 2},
                {wallet: wallet2, amount: 2}, 
            ];
            await startAuctionAndGetTokens(entries);
            // New sake 1,000,000 tokens over 5 days 
            const tokens = 1000000;const length = 5;
            await newStake({tokens, length, wallet: wallet1});

            expect( (await stakingContract.mapStakes(1)).owner ).to.equal(wallet1.address);
        })
        it("rejects if owner != sender", async () => {
            await expect(stakingContract.connect(wallet2).listStakeForSale(1, toWei(1) )).to.be.revertedWith("Unauthorised")
        })
        it("emits the SellStakeRequest event", async () => {
            await expect(await stakingContract.connect(wallet1).listStakeForSale(1, toWei(1) )).to.emit(
                stakingContract, "SellStakeRequest"
            ).withArgs(
                wallet1.address,
                anyValue,
                1, // stake id
                toWei(1),
            );
        })
        it("sets the stake for sale price", async () => {
            expect( (await stakingContract.mapStakes(1)).forSalePrice ).to.equal( toWei(1) );
        })

        it("doesn't allow canncel of sell request by non owner", async () => {
            await expect(stakingContract.connect(wallet2).cancelStakeSellRequest(1)).to.be.revertedWith("Unauthorised")
        })

        it("cancels sell request", async () => {
            await stakingContract.connect(wallet1).cancelStakeSellRequest(1);
            expect( (await stakingContract.mapStakes(1)).forSalePrice ).to.equal( "0" );  
            // Relist 
            await stakingContract.connect(wallet1).listStakeForSale(1, toWei(1) )
        })
    })

    describe("Buy Stake", async () => {
        it("rejects if stake not for sale", async () => {
            await stakingContract.connect(wallet1).cancelStakeSellRequest(1);
            await expect(stakingContract.connect(wallet2).buyStake(1)).to.be.revertedWith("Stake not for sale")
            // Relist 
            await stakingContract.connect(wallet1).listStakeForSale(1, toWei(1) )
        })
        it("rejects if trying to buy own stake", async () => {
            await expect(stakingContract.connect(wallet1).buyStake(1)).to.be.revertedWith("Can't buy own stakes")
        })
        
        it("rejects if msg.value < stake for sale price", async () => {
            await expect( stakingContract.connect(wallet2).buyStake(1,  {value: toWei(0.3)}) ).to.be.revertedWith("msg.value is < stake price")
        })
        let divsBalance;
        let devFees;
        let sellerBalance;
        it("emits stake sold event", async () => {
            divsBalance = await stakingContract.dayDivendPool( await tokenContract.currentDay() );
            devFees = await stakingContract.devFees();
            sellerBalance = await getEtherBalance( wallet1.address );

            await expect(await stakingContract.connect(wallet2).buyStake(1, {value: toWei(1)} )).to.emit(
                stakingContract, "StakeSold"
            ).withArgs(
                wallet1.address,
                wallet2.address,
                anyValue,
                toWei(0.9), // Amount after tax
                1 // stake id
            );
        })
        it("changes the stake owner", async () => {
            expect( (await stakingContract.mapStakes(1)).owner ).to.equal( wallet2.address );
        })
        it("reset the stake for sale price", async () => {
            expect( (await stakingContract.mapStakes(1)).forSalePrice ).to.equal( 0 );
        })

        it("checks the day divs has increased by 5% of the sale", async ()=>{
            const newDivsBalance = await stakingContract.dayDivendPool( await tokenContract.currentDay() );
            expect(newDivsBalance).to.equal( divsBalance.add("50000000000000000") );
        })

        it("checks the dev wallet has increased by 5% of the sale", async ()=>{
            const newdevFees = await stakingContract.devFees();
            expect(newdevFees).to.equal( devFees.add("50000000000000000") );
        })

        it("checks the seller received 90% of the sale", async () => {
            const newSellerBalance = await getEtherBalance( wallet1.address );
            expect(newSellerBalance).to.equal( sellerBalance.add("900000000000000000") );
        })

        it("rejects if stake has ended", async ()=> {
            // List for sale by new owner
            await stakingContract.connect(wallet2).listStakeForSale(1, toWei(1) );
            await fastFoward(); // day 3
            await fastFoward(); // day 4
            await fastFoward(); // day 5
            await fastFoward(); // day 6
            await fastFoward(); // day 6
            await fastFoward(); // day 7
            
            // Check can't be brought
            await expect( stakingContract.connect(wallet1 ).buyStake(1, {value: toWei(1)}) ).to.be.revertedWith("stake can't be brought after it has ended")   
        })
    })
})