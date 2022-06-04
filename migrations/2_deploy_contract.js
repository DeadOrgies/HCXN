const HCXN = artifacts.require("Himalaya");
const Medianiser = artifacts.require("Medianiser");

module.exports = function (deployer, network, accounts) {
  if (network == "development") {
    deployer
      .deploy(
        Medianiser,
        "0x" +
        web3.utils
          .toHex(web3.utils.toWei("3200")) // Assume 1 Ether = $3200
          .substr(2)
          .padStart(64, "0")
      )
      .then(DeployedMedianiser =>
        deployer.deploy(
          HCXN,
          DeployedMedianiser.address,
          6 * 60 * 60,
          {
            value: web3.utils.toWei("1")
          }
        )
      );
  } else if (network == "rinkeby") {
    deployer
      .deploy(
        Medianiser,
        "0x" +
        web3.utils
          .toHex(web3.utils.toWei("3200")) // Assume 1 Ether = $3200
          .substr(2)
          .padStart(64, "0"),
        { from: accounts[0] }
      )
      .then(DeployedMedianiser =>
        deployer.deploy(
          HCXN,
          DeployedMedianiser.address,
          6 * 60 * 60,
          {
            value: web3.utils.toWei("1"),
            from: accounts[1]
          }
        )
      );
  }
  else if (network == "ropsten") {
    deployer
      .deploy(
        Medianiser,
        "0x" +
        web3.utils
          .toHex(web3.utils.toWei("3200")) // Assume 1 Ether = $3200
          .substr(2)
          .padStart(64, "0"),
        { from: accounts[0] }
      )
      .then(DeployedMedianiser =>
        deployer.deploy(
          HCXN,
          DeployedMedianiser.address,
          6 * 60 * 60,
          {
            value: web3.utils.toWei("1"),
            from: accounts[1]
          }
        )
      );
  } else if (network == "kovan") {
    deployer.deploy(
      HCXN,
      "0x9FfFE440258B79c5d6604001674A4722FfC0f7Bc",
      6 * 60 * 60,
      {
        value: web3.utils.toWei("0.5"),
        from: accounts[1]
      }
    );
  } else if (network.indexOf("mainnet") != -1) {
    deployer.deploy(
      HCXN,
      "0x729D19f657BD0614b4985Cf1D82531c67569197B",
      6 * 60 * 60,
      {
        value: web3.utils.toWei("7.35"),
        from: accounts[1]
      }
    );
  }
};
