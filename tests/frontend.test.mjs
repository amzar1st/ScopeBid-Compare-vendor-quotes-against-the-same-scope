import test from "node:test";
import assert from "node:assert/strict";
import {price, receiptOutcome} from "../dist/chain.mjs";
import {demo} from "../dist/demo.mjs";

test("renders amounts according to currency minor units", () => {
  assert.equal(price(985000, "USD"), "$9,850.00");
  assert.equal(price(9850, "JPY"), "¥9,850");
  assert.equal(price(1234, "KWD"), "KWD 1.234");
});

test("accepted writes remain pending and finalized failures stay failed", () => {
  assert.equal(receiptOutcome({statusName:"ACCEPTED",txExecutionResultName:"SUCCESS"}).phase,"Pending");
  assert.equal(receiptOutcome({statusName:"FINALIZED",txExecutionResultName:"SUCCESS"}).phase,"Succeeded");
  assert.equal(receiptOutcome({statusName:"FINALIZED",txExecutionResultName:"ERROR"}).phase,"Failed");
  assert.equal(receiptOutcome({statusName:"FINALIZED"}).phase,"Execution unverified");
  assert.equal(receiptOutcome({statusName:"UNDETERMINED"}).phase,"Failed");
  assert.equal(receiptOutcome({status:"FINALIZED",consensus_data:{leader_receipt:[{execution_result:"ERROR"}]}}).phase,"Failed");
  assert.equal(receiptOutcome({status:"FINALIZED",consensus_data:{leader_receipt:[{execution_result:"SUCCESS"}]}}).phase,"Succeeded");
  assert.equal(receiptOutcome({statusName:"CANCELED"}).phase,"Failed");
});

test("solar demo cites the cheaper quote's paperwork exclusion", () => {
  const [cheap, full] = demo.quotes;
  assert.ok(cheap.price_minor < full.price_minor);
  const [status, [ref]] = cheap.review.rows[1];
  assert.equal(status, "EXCLUDED");
  assert.match(cheap.lines[ref - 1], /interconnection paperwork is excluded/);
  assert.equal(full.review.rows[1][0], "INCLUDED");
  assert.equal(full.review.rows[2][0], "CONDITIONAL");
});
