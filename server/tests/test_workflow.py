"""Workflow tests: a search and a person found, in either order, from every kind of source, through
matching, the pull every device makes, and the family's /status.

    python -m unittest discover -s server/tests -t .
"""
import unittest

from server.tests.support import event, pair, pull, push, record, reset, status

# Where a search can come from. The person found is always registered at Camp A.
SOURCES = {
    "family app": "family-app",
    "phone line": "phone-line",
    "another site": "hospital-b",
}


def found_person(**kw):
    fields = dict(name="Lakshmi Murugan", gender="female", age_band="19–59", village="Meppadi",
                  relative_name="Murugan", relative_relation="father", clothing_marks="red saree, gold nose ring",
                  found_where="near the bus stand", private_detail="Has a scar on her left palm")
    fields.update(kw)
    return record("camp-a", "found", **fields)


def search_from(site, **kw):
    fields = dict(name="Lakshmi Murugan", gender="female", age_band="19–59", village="Meppadi",
                  relative_name="Murugan", relative_relation="father", clothing_marks="red saree",
                  last_seen="bus stand", contact_phone="90000 00000")
    fields.update(kw)
    return record(site, "seeking", **fields)


class SearchAndFoundInEitherOrder(unittest.TestCase):
    def setUp(self):
        reset()

    def check_match(self, found, search, search_site):
        s = pair(found, search)
        self.assertIsNotNone(s, "no suggestion for the pair")
        self.assertGreaterEqual(s["score"], 50)
        # The family's reference code now says a match is being checked.
        self.assertEqual(status(search["code"])["status"], "checking")
        # The camp, the console and the searching site all receive the suggestion (and the other record),
        # which is what their notifications and the console's queue are built from.
        for site in ("camp-a", "authority", search_site):
            data = pull(site)
            self.assertIn(s["id"], {x["id"] for x in data["suggestions"]}, f"{site} does not receive the suggestion")
        self.assertIn(search["id"], {r["id"] for r in pull("camp-a")["records"]})
        self.assertIn(found["id"], {r["id"] for r in pull("authority")["records"]})

    def test_search_first_then_found(self):
        for label, site in SOURCES.items():
            with self.subTest(source=label):
                reset()
                search = search_from(site)
                push(site, [search])
                self.assertEqual(status(search["code"])["status"], "searching")
                found = found_person()
                push("camp-a", [found])
                self.check_match(found, search, site)

    def test_found_first_then_search(self):
        for label, site in SOURCES.items():
            with self.subTest(source=label):
                reset()
                found = found_person()
                push("camp-a", [found])
                search = search_from(site)
                push(site, [search])
                self.check_match(found, search, site)

    def test_sparse_records_with_the_same_full_name(self):
        """The reported case: a family search, then a found person with only name, gender and age, and a name
        that already appears on several other records."""
        for i in range(4):
            push("hospital-b", [record("hospital-b", "found", name=f"Vikas {'XYZW'[i]}anan", gender="male")])
        search = search_from("family-app", name="Vikas B", gender="male", age_band="19–59", village="Madurai",
                             relative_name="Chitra", relative_relation="mother", clothing_marks=None)
        push("family-app", [search])
        found = record("hospital-b", "found", name="Vikas B", gender="male", age_band="19–59")
        push("hospital-b", [found])
        s = pair(found, search)
        self.assertIsNotNone(s)
        self.assertEqual(s["band"], "Possible")
        self.assertEqual(status(search["code"])["status"], "checking")

    def test_an_edited_record_is_matched_again(self):
        search = search_from("family-app")
        push("family-app", [search])
        found = found_person(name="Unknown woman", relative_name=None, village=None, clothing_marks=None)
        push("camp-a", [found])
        self.assertIsNone(pair(found, search))
        found.update(name="Lakshmi Murugan", village="Meppadi", relative_name="Murugan", clothing_marks="red saree")
        push("camp-a", [found])  # the same record, edited
        self.assertIsNotNone(pair(found, search))
        # Other devices receive the edited version.
        names = {r["id"]: r["name"] for r in pull("authority")["records"]}
        self.assertEqual(names[found["id"]], "Lakshmi Murugan")


class ConfirmationsAndStatus(unittest.TestCase):
    def setUp(self):
        reset()

    def test_two_sites_then_family_check(self):
        found, search = found_person(), search_from("hospital-b")
        push("camp-a", [found])
        push("hospital-b", [search])
        push("camp-a", events=[event("confirm", found, search, "camp-a")])
        push("authority", events=[event("family_match", found, search, "authority")])
        self.assertEqual(status(search["code"])["status"], "checking", "one site is not enough for a two-site pair")
        push("hospital-b", events=[event("confirm", found, search, "hospital-b")])
        push("authority", events=[event("family_match", found, search, "authority")])
        self.assertEqual(status(search["code"]), {"status": "found", "help_desk": "Camp A"})

    def test_family_app_search_needs_only_the_camp(self):
        found, search = found_person(), search_from("family-app")
        push("family-app", [search])
        push("camp-a", [found])
        push("camp-a", events=[event("confirm", found, search, "camp-a")])
        push("authority", events=[event("family_match", found, search, "authority")])
        self.assertEqual(status(search["code"]), {"status": "found", "help_desk": "Camp A"})

    def test_rejected_pair_is_not_suggested_again(self):
        found, search = found_person(), search_from("phone-line")
        push("phone-line", [search])
        push("camp-a", [found])
        push("authority", events=[event("rule_out", found, search, "authority")])
        self.assertIsNone(pair(found, search))
        self.assertEqual(status(search["code"])["status"], "searching")


if __name__ == "__main__":
    unittest.main()
