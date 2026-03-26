import json

with open('./out/InversePerpetualVault.sol/InversePerpetualVault.json', 'r') as f:
    vault_abi = json.load(f)['abi']

with open('./out/hBTC.sol/hBTC.json', 'r') as f:
    hbtc_abi = json.load(f)['abi']

# Update UI
ui_path = '../front/Inverse-Perpetual-Protocol/inverse-perp-ui/src/constants/contracts.js'
with open(ui_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
skip = False
for line in lines:
    if line.startswith('export const HBTC_ABI = ['):
        out_lines.append('export const HBTC_ABI = ' + json.dumps(hbtc_abi, indent=2) + '\n')
        skip = True
        continue
    if line.startswith('export const VAULT_ABI = ['):
        out_lines.append('export const VAULT_ABI = ' + json.dumps(vault_abi, indent=2) + '\n')
        skip = True
        continue
    if skip and line.startswith(']'):
        skip = False
        continue
    if not skip:
        out_lines.append(line)

with open(ui_path, 'w', encoding='utf-8') as f:
    f.write("".join(out_lines))

# Update Bot
py_path = '../front/Inverse-Perpetual-Protocol/keeper-bot/config.py'
with open(py_path, 'r', encoding='utf-8') as f:
    py_lines = f.readlines()

out_py = []
skip = False
for line in py_lines:
    if line.startswith('VAULT_ABI = ['):
        vault_py_str = json.dumps(vault_abi, indent=4).replace('true', 'True').replace('false', 'False').replace('null', 'None')
        out_py.append('VAULT_ABI = ' + vault_py_str + '\n')
        skip = True
        continue
    if skip and line.strip() == ']':
        skip = False
        continue
    if not skip:
        out_py.append(line)

with open(py_path, 'w', encoding='utf-8') as f:
    f.write("".join(out_py))

print('ABI Injection successful!')
