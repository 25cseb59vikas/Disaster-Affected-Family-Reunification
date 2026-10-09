"""Regression tests for linked searchers in the new volunteer intake model."""
import unittest
from server.matching import compute
from server.tests.support import record

class LinkedSearcherTests(unittest.TestCase):
    def test_searcher_never_matches_own_search(self):
        person = record('camp-a', 'found', name='Lakshmi', gender='female', age_band='19–59', village='Meppadi')
        search = record('camp-a', 'seeking', name='Lakshmi', gender='female', age_band='19–59', village='Meppadi', searcher_id=person['id'])
        self.assertFalse(any(x['found_id'] == person['id'] for x in compute([person, search], [])))

    def test_searcher_village_is_used_when_missing_person_village_unknown(self):
        searcher = record('camp-a', 'found', name='Lakshmi', village='Meppadi')
        found = record('hospital-b', 'found', name='Karthik', gender='male', age_band='Under 12', village='Meppadi', clothing_marks='red shirt')
        search = record('camp-a', 'seeking', name='Karthik', gender='male', age_band='Under 12', clothing_marks='red shirt', searcher_id=searcher['id'])
        suggestions = compute([searcher, found, search], [])
        self.assertTrue(any(s['found_id'] == found['id'] and s['seeking_id'] == search['id'] for s in suggestions))
