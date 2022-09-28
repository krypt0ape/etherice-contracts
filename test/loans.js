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
const {fromWei, startAuctionAndGetTokens, toWei,  enterAuction, doDailyUpdate, fastFoward, newStake, getTokenBalance, getEtherBalance} = require("../testUtils/helpers")
const hre = require("hardhat")

describe("Test Loans", function(){
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    describe("Requesting a loan on a stake", function(){
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

        it("rejects if sender doesnt own stake", async () => {
            await expect(stakingContract.connect(wallet2).requestLoanOnStake(1, toWei(1), toWei(1.1), 2 )).to.be.revertedWith("Unauthorised")
        })
        it("rejects if stake expiry < loan duraction", async ()=> {
            await expect(stakingContract.connect(wallet1).requestLoanOnStake(1, toWei(1), toWei(1.1), 10 )).to.be.revertedWith("Loan must expire before stake end day")
        })
        it("rejects if loan + interest is  > div - repayments", async () => {
            await fastFoward();
            await fastFoward();
            // Current sake divs balance: 1.86
            await expect(stakingContract.connect(wallet1).requestLoanOnStake(1, toWei(1), toWei(1), 3 )).to.be.revertedWith("Loan amount is > divs earned so far")
        })
        it("rejects if stake has expired", async () => {
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            
            await expect(stakingContract.connect(wallet1).requestLoanOnStake(1, toWei(1), toWei(1.1), 1 )).to.be.revertedWith("Loan must expire before stake end day")
        })

        it("emits new loan request event", async () => {
            // Previous stake has now expired so create a new one
            const tokens = 1000000;const length = 10;
            await newStake({tokens, length, wallet: wallet2});
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            
            // Stake id - 2
            // loan 1 ETH
            // interest 0.5 ETH
            // days 5
            await expect(await stakingContract.connect(wallet2).requestLoanOnStake( 2, toWei(1), toWei(0.5), 5 )).to.emit(
                stakingContract, "NewLoanRequest"
            ).withArgs(
                wallet2.address,
                anyValue,
                toWei(1),
                toWei(0.5),
                5,
                2 // stake id
            );
        })
        it("Saves the requester on the loan struct ", async () => {
            expect( (await stakingContract.mapLoans(2)).requestedBy ).to.equal(wallet2.address);
        })
        it("saves the correct loan amount", async () => {
            expect( (await stakingContract.mapLoans(2)).loanAmount ).to.equal( toWei(1) );
        })
        it("saves the correct interest amount", async () => {
            expect( (await stakingContract.mapLoans(2)).loanInterest ).to.equal( toWei(0.5) );
        })
        it("saves the correct loan duration", async () => {
            expect( (await stakingContract.mapLoans(2)).loanDuration ).to.equal( 5 );
        })
    
        it("doesnt change the default fields", async () => {
            expect( (await stakingContract.mapLoans(2)).startDay ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(2)).endDay ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(2)).filledBy ).to.equal( zeroAddress);
        })
     })

     describe("Filling a loan request", function(){
        it("rejects if msg.value < loan amount", async () => {
            await expect(stakingContract.connect(wallet1).fillLoan(2, {value: toWei(0.9)})).to.be.revertedWith("Not enough eth")
        })
        it("rejects if stake has ended", async () => {
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 12
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 13
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 14
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 15
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 16
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 17
            await fastFoward({tokenContract, wallet1, wallet2}) // -> day 18
            await expect(stakingContract.connect(wallet1).fillLoan(2, {value: toWei(0.9)})).to.be.revertedWith("Stake ended")
        })

        it("checks the stake has a loan request", async () => {
            await expect(stakingContract.connect(wallet1).fillLoan(3, {value: toWei(1)})).to.be.revertedWith("No active loan on this stake")
        })
        
        // TODO check when the loan + interest is sent back to loaner and ensure we dont do it on both sale AND claim.
        it("Emits loan request filled event", async () => {
            // console.log( await getTokenBalance(global.wallet2.address) );
            const tokens = 450000;const length = 10;
            await newStake({tokens, length, wallet: wallet2});
            // Now fast forward a few days so the stake accumilates some divs
            await fastFoward()  // -> day 19
            await fastFoward()  // -> day 20

            // Now we can create a loan request for it, 0.5 ETH over 5 days 0.1 ETH interest
            await stakingContract.connect(wallet2).requestLoanOnStake( 3, toWei(0.5), toWei(0.1), 5 )
            
            await expect(await stakingContract.connect(wallet3).fillLoan( 3, {value: toWei(1)} )).to.emit(
                stakingContract, "LoanRequestFilled"
            ).withArgs(
                wallet3.address,
                anyValue,
                wallet2.address,
                toWei(0.49), // Amount after fees
                3,
            );
        })
        it("sets the filledBy value on the loan", async () => {
            expect( (await stakingContract.mapLoans(3)).filledBy ).to.equal( wallet3.address );
        })
        it("sets the start day on the loan ", async () => {
            expect( (await stakingContract.mapLoans(3)).startDay ).to.equal( 21 );
        })
        it("sets the end day on the loan", async () => {
            expect( (await stakingContract.mapLoans(3)).endDay ).to.equal( 26 );
        })
        it("rejects if already filled", async () => {
            await expect(stakingContract.connect(wallet4).fillLoan(3, {value: toWei(1)})).to.be.revertedWith("Already filled")
        })
        it("doesnt allow another loan to be taken out", async () => {
            await expect( stakingContract.connect(wallet2).requestLoanOnStake( 3, toWei(0.5), toWei(0.1), 5 ) ).to.be.revertedWith("Stake already has outstanding loan")
        })
     })

     describe("Collect loan repayments", function(){
        it("Rejects if loan duration is not met", async ()=> {
            await expect(stakingContract.repayLoan(3)).to.be.revertedWith("Loan duration not met")
        })
        it("emits the LoanRepaid event", async () => {
            await fastFoward()  // -> day 21
            await fastFoward()  // -> day 22
            await fastFoward()  // -> day 23
            await fastFoward()  // -> day 24
            await fastFoward()  // -> day 25
            await fastFoward()  // -> day 26
            
            await helpers.setBalance(wallet3.address, 0);
                      
            await expect( await stakingContract.repayLoan( 3 ) ).to.emit(
                stakingContract, "LoanRepaid"
            ).withArgs(
                wallet3.address,
                anyValue,
                toWei(0.1),
                toWei(0.5),
                3,
            );
        })
        it("updates the loanRepayments amount on the stake", async ()=>{
            expect( (await stakingContract.mapStakes(3)).loanRepayments ).to.equal( toWei(0.6)  );
        })
        it("repays the loaner", async () => {
            expect( await getEtherBalance(wallet3.address) ).to.equal( toWei(0.6) );
        })
        it("clears the loan", async () => {
            expect( (await stakingContract.mapLoans(3)).requestedBy ).to.equal( zeroAddress );
            expect( (await stakingContract.mapLoans(3)).filledBy ).to.equal(  zeroAddress  );
            expect( (await stakingContract.mapLoans(3)).loanAmount ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(3)).loanInterest ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(3)).loanDuration ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(3)).startDay ).to.equal( 0 );
            expect( (await stakingContract.mapLoans(3)).startDay ).to.equal(0);
        })

        it("rejects the loan being filled twice", async () => {
            await expect(stakingContract.repayLoan(3)).to.be.revertedWith("No loan on stake")
        })
     }) 
})