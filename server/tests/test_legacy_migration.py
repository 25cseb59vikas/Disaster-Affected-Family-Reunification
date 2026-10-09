import unittest
from server.tests.support import reset, record, push, pull, pair
from server import store
from server.legacy_migration import migrate_stored_records


class LegacyMigration(unittest.TestCase):
    def setUp(self):
        reset()

    def test_old_found_record_creates_search_and_matches_later(self):
        mother = record('camp-a', 'found', name='Lakshmi', village='Meppadi',
                        looking_for=[{'name': 'Karthik', 'relation': 'son', 'age_band': 'Under 12'}])
        push('camp-a', [mother])
        searches = [r for r in store.all_records() if r['type'] == 'seeking']
        self.assertEqual(len(searches), 1)
        self.assertEqual(searches[0]['searcher_id'], mother['id'])
        self.assertEqual(searches[0]['household_id'], mother['id'])
        self.assertEqual(searches[0]['age_band'], 'Under 12')
        self.assertEqual(migrate_stored_records(store), 0)
        self.assertEqual(len([r for r in store.all_records() if r['type'] == 'seeking']), 1)
        child = record('hospital-b', 'found', name='Karthik', gender='male', age_band='Under 12', village='Meppadi')
        push('hospital-b', [child])
        self.assertIsNotNone(pair(child, searches[0]))

    def test_new_client_linked_search_is_not_duplicated(self):
        mother = record('camp-a', 'found', name='Lakshmi', looking_for=[{'name': 'Karthik', 'relation': 'son'}])
        linked = record('camp-a', 'seeking', name='Karthik', searcher_id=mother['id'])
        push('camp-a', [mother, linked])
        self.assertEqual(len([r for r in store.all_records() if r['type'] == 'seeking']), 1)
