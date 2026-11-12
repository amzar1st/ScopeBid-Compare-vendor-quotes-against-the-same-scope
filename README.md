# ScopeBid

ScopeBid compares signed vendor quotes against one locked RFQ version. In the solar demo, the lowest-price quote excludes utility interconnection paperwork and the higher-price quote includes it. The comparison links each finding to the relevant clause in the quote.

- [Public dashboard](https://scopebid.tinymule33.chatgpt.site)
- [Studionet contract](https://explorer-studio.genlayer.com/address/0xC2BA44d38EDb96244bece64e8d3Dd0A054948Ba0)
- [Live verification](docs/LIVE_VERIFICATION.md)
- [Project Explorer submission](docs/PROJECT_EXPLORER.md)

## Workflow

1. A buyer publishes an RFQ with one currency and up to eight distinct requirements. Revisions receive successive version numbers after the prior version closes.
2. Vendors submit one quote per Studionet address, with a price in minor units and up to 24 numbered clauses. The submitted transaction identifies the signer. The quote text and price remain tied to that RFQ version.
3. The buyer closes the RFQ to new submissions and requests a separate review for each quote.
4. GenLayer validators independently map the requirements to `INCLUDED`, `EXCLUDED`, `CONDITIONAL`, or `MISSING`. A custom validator requires agreement on each outcome and its normalized set of exact line references. Malformed output or disagreement leaves the quote unreviewed and available for retry.
5. The dashboard uses GenLayerJS to read finalized comparisons and track transactions. Each decision binds the RFQ commitment, quote text commitment, signer, policy version, and cited outcomes.

The submitting vendor's signed quote is the primary evidence for what that vendor offered. The solar fixture uses fictional parties. ScopeBid does not check whether the vendor will perform the work or whether a utility grants permission. Quote text is public, the signer represents a wallet address, and one person can control multiple addresses. The app does not award work or move funds. Buyers should use only public or redacted proposals.

## Run locally

```sh
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
python -m http.server 8080 --directory dist
```

The Python tests replace the GenVM storage and model APIs with test doubles. Studionet receipts and the finalized comparison document the real execution path. The static website delegates signing to Studio's built-in account, so visitors need no browser wallet extension to review results. See the [reproduction steps](docs/LIVE_VERIFICATION.md).

## Source

- [Intelligent Contract](contracts/scope_bid.py)
- [Dashboard and chain integration](dist/)
- [Contract and frontend tests](tests/)
