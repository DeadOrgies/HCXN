const { assertRevert: assertRevert } = require("./assertRevert");
const { time } = require("@openzeppelin/test-helpers");

const HCXN_Abstraction = artifacts.require("Himalaya");
const FMedianiser = artifacts.require("Medianiser");
let HCXN;
const medianiser_value =
  "0x" +
  web3.utils
    .toHex(web3.utils.toWei("3200")) // Assume 1 Ether = $3200
    .substr(2)
    .padStart(64, "0");

function weify(n) {
  return web3.utils.toBN(web3.utils.toWei(n.toString()));
}

contract("HCXN", accounts => {
  beforeEach(async () => {
    let Medianiser = await FMedianiser.new(medianiser_value, {
      from: accounts[0]
    });
    HCXN = await HCXN_Abstraction.new(Medianiser.address, 6 * 60 * 60, {
      from: accounts[1],
      value: web3.utils.toWei("0.0625")
    });
    await HCXN.getHCXN({ from: accounts[0], value: web3.utils.toWei("0.0625") });
  });



  context("creation:", () => {
    it("should create an initial pool of 100 HCXN, and owner then gets 100 HCXN by giving 0.03125 ETH", async () => {
      const pool_balance = await HCXN.balanceOf(HCXN.address);
      const owner_balance = await HCXN.balanceOf(accounts[0]);
      assert.deepStrictEqual(pool_balance, weify(100));
      assert.deepStrictEqual(owner_balance, weify(100));
    });

    it("should have correct vanity information", async () => {
      const name = await HCXN.name();
      assert.strictEqual(name, "HimalayaStableCoin");

      const decimals = await HCXN.decimals();
      assert.strictEqual(decimals.toNumber(), 18);

      const symbol = await HCXN.symbol();
      assert.strictEqual(symbol, "HCXN");
    });
  });

  context("transfers:", () => {
    it("should transfer 100 HCXN to accounts[1] with accounts[0] having 100 HCXN", async () => {
      await HCXN.transfer(accounts[1], weify(100), { from: accounts[0] });
      const balance1 = await HCXN.balanceOf(accounts[1]);
      assert.deepStrictEqual(balance1, weify(100));
      const balance0 = await HCXN.balanceOf(accounts[0]);
      assert.deepStrictEqual(balance0, weify(0));
    });

    it("should fail when trying to transfer 101 HCXN to accounts[1] with accounts[0] having 100 HCXN", async () => {
      await assertRevert(
        HCXN.transfer(accounts[1], weify(101), { from: accounts[0] })
      );
    });

    it("should handle zero-transfers normally", async () => {
      assert(
        await HCXN.transfer(accounts[1], 0, { from: accounts[0] }),
        "zero-transfer has failed"
      );
    });

    it("should fail when trying to transfer to the 0 address", async () => {
      await assertRevert(
        HCXN.transfer("0x0000000000000000000000000000000000000000", weify(0.03125), {
          from: accounts[0]
        })
      );
    });
  });

  context("events:", () => {
    it("should fire Transfer event properly", async () => {
      const res = await HCXN.transfer(accounts[1], weify(25), {
        from: accounts[0]
      });
      const transferLog = res.logs.find(element =>
        element.event.match("Transfer")
      );
      assert.strictEqual(transferLog.args.from, accounts[0]);
      assert.strictEqual(transferLog.args.to, accounts[1]);
      assert.deepStrictEqual(transferLog.args.tokens, weify(25));
    });

    it("should fire Transfer event normally on a zero transfer", async () => {
      const res = await HCXN.transfer(accounts[1], weify(0), {
        from: accounts[0]
      });
      const transferLog = res.logs.find(element =>
        element.event.match("Transfer")
      );
      assert.strictEqual(transferLog.args.from, accounts[0]);
      assert.strictEqual(transferLog.args.to, accounts[1]);
      assert.deepStrictEqual(transferLog.args.tokens, weify(0));
    });

    it("should fire Approval event properly", async () => {
      const res = await HCXN.approve(accounts[1], weify(25), {
        from: accounts[0]
      });
      const approvalLog = res.logs.find(element =>
        element.event.match("Approval")
      );
      assert.strictEqual(approvalLog.args.owner, accounts[0]);
      assert.strictEqual(approvalLog.args.spender, accounts[1]);
      assert.deepStrictEqual(approvalLog.args.tokens, weify(25));
    });

    it("should fire Burn, Transfer events on burn", async () => {
      const res = await HCXN.burn(weify(50), { from: accounts[0] });
      const burnLog = await res.logs.find(element =>
        element.event.match("Burn")
      );
      const transferLog = await res.logs.find(element =>
        element.event.match("Transfer")
      );

      assert.strictEqual(transferLog.args.from, accounts[0]);
      assert.strictEqual(
        transferLog.args.to,
        "0x0000000000000000000000000000000000000000"
      );
      assert.deepStrictEqual(transferLog.args.tokens, weify(50));
      assert.strictEqual(burnLog.args.owner, accounts[0]);
      assert.deepStrictEqual(burnLog.args.tokens, weify(50));
    });
  });

  context("burn:", () => {
    it("should decrease balance and total supply", async () => {
      await HCXN.burn(weify(50), { from: accounts[0] });
      const totalSupply = await HCXN.totalSupply();
      const balance = await HCXN.balanceOf(accounts[0]);
      assert.deepStrictEqual(weify(50), balance);
      assert.deepStrictEqual(weify(150), totalSupply);
    });
  });

  context("conversion:", () => {
    it("should convert 0.03125 Ether sent to contract to 20 HCXN directly", async () => {
      await HCXN.sendTransaction({
        from: accounts[1],
        value: weify(0.03125)
      });
      const balance = await HCXN.balanceOf(accounts[1]);
      assert.deepStrictEqual(weify(20), balance);
    });

    it("should convert 100 HCXN sent to contract to 0.03125 Ether directly", async () => {
      const startBalance = web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      await HCXN.transfer(HCXN.address, weify(100), {
        from: accounts[0]
      });
      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.equal(
        startBalance.sub(afterBalance).toString(),
        weify(0.0625).toString()
      );
    });

    it("should convert 0.03125 Ether to 20 HCXN with getHCXN()", async () => {
      await HCXN.getHCXN({
        from: accounts[1],
        value: weify(0.03125)
      });
      const balance = await HCXN.balanceOf(accounts[1]);
      assert.deepStrictEqual(weify(20), balance);
    });

    it("should convert 100 HCXN to 0.03125 Ether with getEther()", async () => {
      const startBalance = web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      await HCXN.getEther(weify(100), {
        from: accounts[0]
      });
      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.equal(
        startBalance.sub(afterBalance).toString(),
        weify(0.0625).toString()
      );
    });
  });



  context("oracle-adjustment:", () => {
    it("should adjust pool by 10% of deviation if deviation is > 1%", async () => {
      let pool_balance = await HCXN.balanceOf(HCXN.address);
      let owner_balance = await HCXN.balanceOf(accounts[0]);
      let pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );

      assert.deepStrictEqual(pool_balance, weify(100));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));

      await time.increase(60 * 60 * 6 + 30);
      await HCXN.transfer(accounts[1], weify(0), { from: accounts[0] });
      // 0.125 ETH = 400 USD is far off the 100 HCXN in the pool
      // Pool size should be 200 HCXN according to oracle
      // Therefore, since 400 > 100*1.01, we find a delta of 300 HCXN
      // Then, we inflate the pool by 10% of 300 HCXN (30 HCXN).
      pool_balance = await HCXN.balanceOf(HCXN.address);
      owner_balance = await HCXN.balanceOf(accounts[0]);
      pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(130));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));
    });

    it("should not adjust pool if deviation is < 1%", async () => {
      let pool_balance = await HCXN.balanceOf(HCXN.address);
      let owner_balance = await HCXN.balanceOf(accounts[0]);
      let pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(100));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));

      await HCXN.transfer(HCXN.address, weify(100), { from: accounts[0] });
      await time.increase(60 * 60 * 6 + 30);
      pool_balance = await HCXN.balanceOf(HCXN.address);
      owner_balance = await HCXN.balanceOf(accounts[0]);
      pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(200));
      assert.deepStrictEqual(owner_balance, weify(0));
      assert.deepStrictEqual(pool_eth_balance, weify(0.0625));
    });

    it("should take 6 hours before an adjustment can occur", async () => {
      let pool_balance = await HCXN.balanceOf(HCXN.address);
      let owner_balance = await HCXN.balanceOf(accounts[0]);
      let pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(100));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));

      // Wait, do a transfer, shouldn't trigger an adjustment
      await time.increase(60 * 60 * 6 - 15);
      await HCXN.transfer(accounts[1], weify(0), { from: accounts[0] });

      pool_balance = await HCXN.balanceOf(HCXN.address);
      owner_balance = await HCXN.balanceOf(accounts[0]);
      pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(100));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));

      // Wait again, now should trigger an adjustment
      await time.increase(30);
      await HCXN.transfer(accounts[1], weify(0), { from: accounts[0] });

      pool_balance = await HCXN.balanceOf(HCXN.address);
      owner_balance = await HCXN.balanceOf(accounts[0]);
      pool_eth_balance = await web3.utils.toBN(
        await web3.eth.getBalance(HCXN.address)
      );
      assert.deepStrictEqual(pool_balance, weify(130));
      assert.deepStrictEqual(owner_balance, weify(100));
      assert.deepStrictEqual(pool_eth_balance, weify(0.125));
    });
  });


});
