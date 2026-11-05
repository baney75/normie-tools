import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import receipt_totals as rt  # noqa: E402


class Totals(unittest.TestCase):
    def test_cents(self):
        self.assertEqual(rt.to_cents("3.49"), 349)
        self.assertEqual(rt.to_cents("-1.00"), -100)
        self.assertEqual(rt.to_cents("$5"), 500)
        self.assertEqual(rt.to_cents("0.1"), 10)
        self.assertIsNone(rt.to_cents("1.234"))
        self.assertIsNone(rt.to_cents("abc"))

    def test_no_float_drift(self):
        rows = [{"store": "A", "price": "0.10"} for _ in range(3)]
        self.assertEqual(rt.totals(rows)[1], 30)

    def test_sample(self):
        import csv
        path = os.path.join(os.path.dirname(__file__), "..", "examples", "sample-receipts.csv")
        with open(path, newline="") as f:
            per_store, total, flagged = rt.totals(list(csv.DictReader(f)))
        self.assertEqual(per_store["Corner Market"], 548)
        self.assertEqual(per_store["Hardware Hut"], 1035)
        self.assertEqual(total, 1583)
        self.assertEqual(flagged, [6])

    def test_money(self):
        self.assertEqual(rt.money(-5), "-0.05")
        self.assertEqual(rt.money(1583), "15.83")


if __name__ == "__main__":
    unittest.main()
