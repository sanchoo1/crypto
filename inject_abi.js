const fs = require('fs');

try {
    const vaultAbi = JSON.parse(fs.readFileSync('./out/InversePerpetualVault.sol/InversePerpetualVault.json', 'utf8')).abi;
    const hbtcAbi = JSON.parse(fs.readFileSync('./out/hBTC.sol/hBTC.json', 'utf8')).abi;

    // 1. Update contracts.js
    console.log("Updating Frontend ABIs...");
    const uiPath = '../front/Inverse-Perpetual-Protocol/inverse-perp-ui/src/constants/contracts.js';
    const lines = fs.readFileSync(uiPath, 'utf8').split('\n');

    let resultLines = [];
    let skip = false;
    for (const line of lines) {
        if (line.startsWith('export const HBTC_ABI = [')) {
            resultLines.push(`export const HBTC_ABI = ${JSON.stringify(hbtcAbi, null, 2)}`);
            skip = true;
            continue;
        }
        if (line.startsWith('export const VAULT_ABI = [')) {
            resultLines.push(`export const VAULT_ABI = ${JSON.stringify(vaultAbi, null, 2)}`);
            skip = true;
            continue;
        }
        
        if (skip && line.startsWith(']')) {
            skip = false;
            continue;
        }
        
        if (!skip) {
            resultLines.push(line);
        }
    }
    fs.writeFileSync(uiPath, resultLines.join('\n'));

    // 2. Update config.py
    console.log("Updating Bot ABIs...");
    const pyPath = '../front/Inverse-Perpetual-Protocol/keeper-bot/config.py';
    const pyLines = fs.readFileSync(pyPath, 'utf8').split('\n');
    let pyResult = [];
    let pySkip = false;
    for (const line of pyLines) {
        if (line.startsWith('VAULT_ABI = [')) {
            pyResult.push(`VAULT_ABI = ${JSON.stringify(vaultAbi, null, 4).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}`);
            pySkip = true;
            continue;
        }
        if (pySkip && line === ']') {
            pySkip = false;
            continue;
        }
        if (!pySkip) {
            pyResult.push(line);
        }
    }
    fs.writeFileSync(pyPath, pyResult.join('\n'));
    console.log("ABI Injection successful!");
} catch (e) {
    console.error("Failed ABI injection", e);
}
