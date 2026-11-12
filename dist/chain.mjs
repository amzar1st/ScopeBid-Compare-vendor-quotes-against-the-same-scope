export function receiptOutcome(receipt) {
  const status = String(receipt.statusName ?? receipt.status ?? "UNKNOWN").toUpperCase();
  const leaders = receipt.consensus_data?.leader_receipt;
  const leader = Array.isArray(leaders) ? leaders.at(-1) : leaders;
  const result = String(receipt.txExecutionResultName ?? receipt.txExecutionResult ??
    leader?.execution_result ?? "").toUpperCase();
  if (["CANCELED","CANCELLED","UNDETERMINED"].includes(status)) return {phase:"Failed",status,result};
  if (status !== "FINALIZED" && status !== "7") return {phase:"Pending",status,result};
  if (["SUCCESS","FINISHED_WITH_RETURN"].includes(result)) return {phase:"Succeeded",status,result};
  return {phase:result ? "Failed" : "Execution unverified",status,result};
}

let connection;
export function connect() {
  connection ??= Promise.all([
    import("https://cdn.jsdelivr.net/npm/genlayer-js@1.1.8/+esm"),
    import("https://cdn.jsdelivr.net/npm/genlayer-js@1.1.8/chains/+esm"),
    import("https://cdn.jsdelivr.net/npm/genlayer-js@1.1.8/types/+esm")
  ]).then(([sdk, chains, types]) => ({
    client:sdk.createClient({chain:chains.studionet}), final:types.TransactionHashVariant.LATEST_FINAL
  })).catch(error => { connection = null; throw error; });
  return connection;
}

export function price(amount, currency) {
  const format = new Intl.NumberFormat("en-US", {style:"currency",currency});
  return format.format(amount / (10 ** format.resolvedOptions().maximumFractionDigits));
}
