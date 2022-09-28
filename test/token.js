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
const {fromWei, startAuctionAndGetTokens, toWei, newStake, enterAuction, doDailyUpdate, fastFoward} = require("../testUtils/helpers")
const hre = require("hardhat")
describe("Tests the basic token functionality", function(){
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    describe("Token Name & Ticker", function(){
        it("Set the token name to Etherice", async () => {
            expect( await tokenContract.name( )).to.equal( "Etherice" )
        })
    
        it("Sets the ticker to ETR", async () => {
            expect( await tokenContract.symbol( )).to.equal( "ETR" )
        })
    })

    describe("Sending Tokens",  () =>  {
        it("Gets some tokens", async () => {
            const entries = [
                {wallet: wallet1, amount: 2},
                {wallet: wallet2, amount: 2}, 
            ];
            await startAuctionAndGetTokens(entries);
            expect( await  tokenContract.balanceOf(wallet1.address) ).to.equal( toWei( 2910000 / 2 ))
        })
        it("Sends them to another user", async () => {
            await tokenContract.connect(wallet1).transfer(wallet3.address, toWei(100000) );
            expect( await tokenContract.balanceOf(wallet3.address) ).to.equal( toWei( 100000 ))
        })
    })
})