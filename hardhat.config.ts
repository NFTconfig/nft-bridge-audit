import 'dotenv/config';
import "@nomiclabs/hardhat-waffle";
import '@typechain/hardhat'
import "@nomiclabs/hardhat-etherscan";
import './tasks/NFTBridge'


/* note: boolean environment variables are imported as strings */
const { PRIVATE_KEY } = process.env;
const mnemonic = PRIVATE_KEY
module.exports = {
    hardhat: {
        accounts: [mnemonic],
        url: 'http://127.0.0.1:8545',
        chainId: 1337,
        gas: 3000000,
        gasPrice: "auto",
        setTimeout: 30000000
    },
    solidity: {
        compilers: [
            {
                version: "0.8.14",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                }
            }
        ]
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    mocha: {
        timeout: 40000
    },
    typechain: {
        outDir: "build/types",
        target: "ethers-v5"
    }
}
