const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXOToken = artifacts.require('EXOToken');
const migrationHelper = require('./migration_helper.js');
let network;

module.exports = function (callback) {
  web3.version.getNetwork((err, networkId) => {
    if (err) {
      callback(err);
      return;
    }
    network = migrationHelper.getNetworkName(networkId);

    const contracts = migrationHelper.loadContracts(network);
    let exoStorageAddress, exoUpgradeAddress;
    if (network === 'development') {
      exoStorageAddress = EXOStorage.address;
      exoUpgradeAddress = EXOUpgrade.address;
    } else {
      exoStorageAddress = contracts.EXOStorage;
      exoUpgradeAddress = contracts.EXOUpgrade;
    }
    if (! exoStorageAddress || ! exoUpgradeAddress) {
      callback(new Error('Required contract addresses not found'));
    }

    EXOToken.new(
      exoStorageAddress,
      100000000, // total supply
      50000000, // minimum balance for stake reward
      10000000, // locked treasury fund
      5000000, // locked pre-sale fund
      1209600, // pre-sale duration
      2419200, // ICO duration
      25000000, // available ICO fund
      3650, // minimum ICO tokens bought every purchase (1 ETH)
      18250, // maximum ICO tokens bought for all purchases (5 ETH)
      10, // airdrop amount
      {
        gas: 7000000
      }
    ).then(async exoToken => {
      const exoUpgrade = EXOUpgrade.at(exoUpgradeAddress);
      exoUpgrade.upgradeContract('EXOToken', exoToken.address, false)
        .then(result => {
          if (parseInt(result.receipt.status, 16) === 1) {
            console.log('EXOToken upgrade - SUCCESS');
            console.log('Transaction', result.receipt.transactionHash);
            console.log('Contract lives at', exoToken.address);

            contracts.EXOToken = exoToken.address;
            migrationHelper.saveContracts(contracts, network);

            callback();
          } else {
            callback(new Error('Upgrade failed at transaction '+result.receipt.transactionHash));
          }
        });
    });
  });
};
