"""Exercise the contract with local storage and independent model responses."""
import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch


class UserError(Exception):
    pass


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


def public(method):
    return method


gl = SimpleNamespace(
    Contract=object,
    message=SimpleNamespace(sender_address="buyer"),
    public=SimpleNamespace(write=public, view=public),
    nondet=SimpleNamespace(exec_prompt=None),
    vm=SimpleNamespace(UserError=UserError, Return=Return, run_nondet_unsafe=None),
)
stub = ModuleType("genlayer")
stub.__dict__.update(gl=gl, TreeMap=dict, u32=int, u64=int, Address=str)
spec = importlib.util.spec_from_file_location(
    "scope_bid", Path(__file__).parents[1] / "contracts/scope_bid.py"
)
contract = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"genlayer": stub}):
    spec.loader.exec_module(contract)


class ScopeBidTests(unittest.TestCase):
    def setUp(self):
        self.app = contract.ScopeBid()
        self.app.scopes = {}
        self.app.quotes = {}
        self.sender("buyer")
        self.app.publish("solar", 1, "Solar", "USD", '["Install array","Submit utility paperwork"]')

    def sender(self, account):
        gl.message.sender_address = account

    def add_quote(self, signer, amount):
        self.sender(signer)
        self.app.submit_quote("solar", 1, signer, amount, '["Array included","Utility filing excluded"]')

    def comparison(self):
        return json.loads(self.app.get_comparison("solar", 1))

    def close(self):
        self.sender("buyer")
        self.app.close("solar", 1)

    def consensus(self, leader_rows, independent_rows):
        responses = iter([{"rows": leader_rows}, {"rows": independent_rows}])
        gl.nondet.exec_prompt = lambda *args, **kwargs: next(responses)

        def run(leader, validator):
            result = leader()
            if not validator(Return(result)):
                raise UserError("Consensus disagreement")
            return result

        gl.vm.run_nondet_unsafe = run

    def test_comparison_and_evidence_hashes(self):
        self.add_quote("expensive", 1090000)
        self.add_quote("cheap", 985000)
        self.close()
        rows = [["INCLUDED", [1]], ["EXCLUDED", [2]]]
        self.consensus(rows, rows)
        self.app.review("solar", 1, "cheap")
        view = self.comparison()
        self.assertTrue(view["scope"]["closed"])
        self.assertEqual([q["signer"] for q in view["quotes"]], ["cheap", "expensive"])
        quote = view["quotes"][0]
        self.assertEqual(quote["review"]["rows"], rows)
        self.assertEqual(quote["lines"][1], "Utility filing excluded")
        self.assertEqual(quote["review"]["quote_sha256"], contract.digest(contract.encode(quote["lines"])))
        self.assertEqual(quote["review"]["scope_sha256"], view["scope"]["scope_sha256"])
        digest = quote["review"].pop("decision_sha256")
        self.assertEqual(digest, contract.digest(contract.encode(quote["review"])))
        self.assertIsNone(view["quotes"][1]["review"])
        with self.assertRaisesRegex(UserError, "already reviewed"):
            self.app.review("solar", 1, "cheap")

    def test_review_disagreement_leaves_quote_retryable(self):
        self.add_quote("cheap", 985000)
        self.close()
        rows = [["INCLUDED", [1]], ["EXCLUDED", [2]]]
        for mismatch in ([["INCLUDED", [1]], ["CONDITIONAL", [2]]],
                         [["INCLUDED", [1]], ["EXCLUDED", [1, 2]]]):
            self.consensus(rows, mismatch)
            with self.assertRaisesRegex(UserError, "disagreement"):
                self.app.review("solar", 1, "cheap")
            self.assertIsNone(self.comparison()["quotes"][0]["review"])
        self.consensus(rows, rows)
        self.app.review("solar", 1, "cheap")

    def test_rejects_malformed_model_citations(self):
        self.add_quote("cheap", 985000)
        self.close()
        for row in (["MISSING", [2]], ["EXCLUDED", [3]], ["EXCLUDED", [True]],
                    ["EXCLUDED", [2, 2]], ["EXCLUDED", []], ["HALLUCINATED", [2]]):
            rows = [["INCLUDED", [1]], row]
            self.consensus(rows, rows)
            with self.assertRaisesRegex(UserError, "Invalid assessment"):
                self.app.review("solar", 1, "cheap")

    def test_authorization_and_lifecycle(self):
        self.add_quote("vendor", 985000)
        with self.assertRaisesRegex(UserError, "already submitted"):
            self.add_quote("vendor", 1)
        with self.assertRaisesRegex(UserError, "Buyer only"):
            self.app.close("solar", 1)
        with self.assertRaisesRegex(UserError, "Buyer only"):
            self.app.review("solar", 1, "vendor")
        self.sender("buyer")
        with self.assertRaisesRegex(UserError, "before reviewing"):
            self.app.review("solar", 1, "vendor")
        self.close()
        with self.assertRaisesRegex(UserError, "closed"):
            self.add_quote("other", 1)
        self.sender("buyer")
        with self.assertRaisesRegex(UserError, "does not exist"):
            self.app.review("solar", 1, "other")

    def test_versions_remain_independent(self):
        with self.assertRaisesRegex(UserError, "already published"):
            self.app.publish("solar", 1, "Changed", "USD", "New scope")
        with self.assertRaisesRegex(UserError, "Close prior"):
            self.app.publish("solar", 2, "Changed", "USD", "New scope")
        self.close()
        self.sender("other")
        with self.assertRaisesRegex(UserError, "Close prior"):
            self.app.publish("solar", 2, "Changed", "USD", "New scope")
        self.sender("buyer")
        self.app.publish("solar", 2, "Changed", "USD", "New scope")
        self.assertEqual(json.loads(self.app.get_comparison("solar", 2))["scope"]["requirements"], ["New scope"])
        self.assertEqual(self.comparison()["scope"]["requirements"], ["Install array", "Submit utility paperwork"])

    def test_input_limits_and_capacity(self):
        for body in ('["a",null]', '["a\\nb"]', "[]", "[" + "a" * 4200, "x" * 401):
            with self.assertRaises(UserError):
                self.app.submit_quote("solar", 1, "Vendor", 1, body)
        with self.assertRaisesRegex(UserError, "Invalid price"):
            self.app.submit_quote("solar", 1, "Vendor", 0, "Array included")
        for index in range(8):
            self.add_quote(str(index), index + 1)
        with self.assertRaisesRegex(UserError, "capacity"):
            self.add_quote("ninth", 9)


if __name__ == "__main__":
    unittest.main()
