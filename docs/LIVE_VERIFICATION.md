# ScopeBid live verification

- Network: GenLayer Studionet, chain ID 61999.
- [Public ScopeBid dashboard](https://scopebid.tinymule33.chatgpt.site) loads RFQ `solar-rooftop`, version `1`, by default.
- [Active contract](https://explorer-studio.genlayer.com/address/0xC2BA44d38EDb96244bece64e8d3Dd0A054948Ba0).
- [Current contract source](../contracts/scope_bid.py) SHA-256: `c525dc373dec7acd0e8404198d37cf1ade38ee79332abe5500e30de2f198c71a`.
- Studio built-in buyer account: `0xffE74E2F480173092216096275CdA04AFd4eACbE`.
- BrightPeak signer: `0xe511e0B1485F53f7d454D791C67cb6C45862abce`.
- GridReady signer: `0x134144Bc9bbfB110855179C6cB73784b033535f4`.

| Action | Studionet transaction |
| --- | --- |
| Deploy active contract | [Deployment](https://explorer-studio.genlayer.com/tx/0x6b78191e50cc89a6bdcac9206287d046c267acf941a4f3ef5e3d070634263810) |
| Publish solar RFQ | [Publish](https://explorer-studio.genlayer.com/tx/0xe7be6651075a718f8653a4e7e2ceb50bef600f207bbcd97fb7844a85060a46f1) |
| BrightPeak Solar submits $9,850 quote | [BrightPeak submission](https://explorer-studio.genlayer.com/tx/0x3f90f2810db47cae0ae5adcf05598f491cc78d2136b34bfa85801dfcfe8cd053) |
| GridReady Energy submits $10,900 quote | [GridReady submission](https://explorer-studio.genlayer.com/tx/0x5cca8e27909f39f4b7761837bc05d341972474b6bbe779886c2c00b3e97618c8) |
| Close RFQ | [Close](https://explorer-studio.genlayer.com/tx/0x3ee629ecb5b134a9f6f673342e6c2f173fd1e11c8f0bea2e20a91cbb0ef550f8) |
| Upgrade signer encoding and user errors in place | [Upgrade](https://explorer-studio.genlayer.com/tx/0xe1f4683b86ac05c929af34a37de70ce4172fe25ce705253f9c767e0f26190172) |
| BrightPeak review after upgrade | [BrightPeak review](https://explorer-studio.genlayer.com/tx/0xa5d8560acdf9a457917737a6593a518aa51aeff540f61a23630eeb7f2a46573d) |
| GridReady review after upgrade | [GridReady review](https://explorer-studio.genlayer.com/tx/0x5f15bf4d664c74fd5734a5a050bf93e4ac97e2dbc266579508d226c1c5326895) |
| Failure used to test receipt display | [Review before RFQ closure](https://explorer-studio.genlayer.com/tx/0xde4dd60a7b384eaad4cc4bd5b4ea675a55705ef0726c38c80ffce098a14b272c) |

A first prototype deployment was superseded when the Studio form proved to use single-line text inputs. The active deployment accepts JSON arrays in those inputs. The in-place upgrade preserved the RFQ and quotes and made the signer argument compatible with the Studio write form. The dashboard recognizes execution failures on finalized receipts.

## Finalized comparison

| Requirement | BrightPeak Solar · $9,850 | GridReady Energy · $10,900 |
| --- | --- | --- |
| Supply and install a 6 kW rooftop array | INCLUDED · line 1 | INCLUDED · line 1 |
| Prepare and submit grid interconnection paperwork | EXCLUDED · line 2 | INCLUDED · line 2 |
| Commission and provide homeowner handover | INCLUDED · line 3 | CONDITIONAL · line 3 |

Both reviews finalized successfully in Studio's full-consensus mode. BrightPeak decision SHA-256 is `819cee9db93b730556de99973f20326e3c5aa99c3b98f096b78afdfb561dd339`. GridReady decision SHA-256 is `18e92659e262a831cc96889da11f4b9e955bb0d8db402d1eeae884b147029b46`.

## Reproduce

1. Open the dashboard to load the finalized comparison. Click a citation to expand the numbered source quote. Paste any linked transaction hash into the tracker to see its status.
2. For a fresh run, open [GenLayer Studio](https://studio.genlayer.com/contracts), create a Python file from the current contract source, and deploy it from Run and Debug in **Normal (Full Consensus)** mode with a built-in account.
3. Choose an unused RFQ ID. Use the dashboard’s **Prepare a Studio write** form to prepare each method’s values. Paste the requirements and proposal values as single-line JSON arrays into Studio. Use the same RFQ ID and version for all calls.
4. Publish as the buyer, submit quotes from two distinct built-in vendor accounts, and close as the buyer. Wait for each required predecessor to finalize and check the execution outcome.
5. As buyer, call `review` for each vendor signer. In Studio, select **Finalized** and call `get_comparison` after both reviews finalize. The dashboard reads the same state when given the contract address, RFQ ID, and version.

The full example requirements and quotes are in [demo.mjs](../dist/demo.mjs). All example names and quote terms are fictional. The wallet signature anchors who submitted each quotation on chain, while quote lines supply the authoritative evidence for that quotation’s stated scope.

## Automated verification

Run `python -m unittest discover -s tests -v` and `node --test tests/*.test.mjs`. Six contract tests cover input bounds, authorization, immutable versions, retry, malformed citations, decision hashes, and the complete lifecycle with test doubles. Three frontend tests cover currency display, receipt classification, and the demo citation.
