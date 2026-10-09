"""Part 5: fictional matching evaluation. Run from repository root:
    python -m unittest server.tests.test_matching_evaluation -v
No database writes; uses matching.compute in memory.
"""
import json
import time
import unittest
from server.matching import compute
from server.tests.support import record


def found(name, **kwargs):
    return record('camp-a', 'found', name=name, **kwargs)


def seeking(name, **kwargs):
    return record('family-app', 'seeking', name=name, **kwargs)


class MatchingEvaluation(unittest.TestCase):
    def test_fictional_pair_matrix(self):
        # Each case is evaluated independently to avoid accidental cross-case candidates.
        cases = [
            ('exact_full_details', True,
             found('Lakshmi Murugan', gender='female', age_band='19–59', village='Meppadi', relative_name='Murugan', clothing_marks='red saree'),
             seeking('Lakshmi Murugan', gender='female', age_band='19–59', village='Meppadi', relative_name='Murugan', clothing_marks='red saree')),
            ('transliterated_name', True,
             found('Lakshmi', gender='female', age_band='19–59', village='Meppadi', relative_name='Murugan', clothing_marks='red saree'),
             seeking('Latchumi', gender='female', age_band='19–59', village='Meppadi', relative_name='Murugan', clothing_marks='red saree')),
            ('sparse_exact_name', True,
             found('Karthik Raja', gender='male', age_band='Under 12'),
             seeking('Karthik Raja', gender='male', age_band='Under 12')),
            ('different_names', False,
             found('Arun Kumar', gender='male', age_band='19–59', village='Meppadi'),
             seeking('Priya Devi', gender='female', age_band='19–59', village='Madurai')),
            ('same_name_different_gender', False,
             found('Selvi', gender='female', age_band='19–59'),
             seeking('Selvi', gender='male', age_band='19–59')),
            ('common_name_conflicting_relatives', False,
             found('Ravi', gender='male', age_band='19–59', relative_name='Kumar', relative_relation='father', village='Meppadi'),
             seeking('Ravi', gender='male', age_band='19–59', relative_name='Ganesan', relative_relation='father', village='Madurai')),
            ('same_clothing_different_name', False,
             found('Meena', gender='female', age_band='19–59', clothing_marks='red saree'),
             seeking('Geetha', gender='female', age_band='19–59', clothing_marks='red saree')),
            ('name_and_location', True,
             found('Arunkumar', gender='male', age_band='19–59', village='Madurai', found_where='bus stand'),
             seeking('Arun Kumar', gender='male', age_band='19–59', village='Madurai', last_seen='bus stand')),
        ]
        rows = []
        for label, expected, f, s in cases:
            start = time.perf_counter()
            suggestions = compute([f, s], [])
            elapsed_ms = round((time.perf_counter() - start) * 1000, 3)
            suggestion = next((x for x in suggestions if x['found_id'] == f['id'] and x['seeking_id'] == s['id']), None)
            rows.append({'case': label, 'actual_match': bool(suggestion), 'expected_match': expected,
                         'score': suggestion['score'] if suggestion else None,
                         'band': suggestion['band'] if suggestion else None,
                         'latency_ms': elapsed_ms})
        tp = sum(r['actual_match'] and r['expected_match'] for r in rows)
        fp = sum(r['actual_match'] and not r['expected_match'] for r in rows)
        fn = sum(not r['actual_match'] and r['expected_match'] for r in rows)
        tn = sum(not r['actual_match'] and not r['expected_match'] for r in rows)
        report = {'true_positive': tp, 'false_positive': fp, 'false_negative': fn, 'true_negative': tn,
                  'precision': round(tp / (tp + fp), 4) if tp + fp else None,
                  'recall': round(tp / (tp + fn), 4) if tp + fn else None,
                  'cases': rows}
        print('\nPART5_MATCHING_REPORT=' + json.dumps(report, ensure_ascii=False))
        self.assertEqual(len(rows), 8)

    def test_self_match_and_rule_out(self):
        f = found('Karthik', gender='male', age_band='Under 12', village='Meppadi')
        s = seeking('Karthik', gender='male', age_band='Under 12', village='Meppadi', searcher_id=f['id'])
        self.assertEqual(compute([f, s], []), [], 'person must never match their own search')
        other = seeking('Karthik', gender='male', age_band='Under 12', village='Meppadi')
        event = {'kind': 'rule_out', 'found_id': f['id'], 'seeking_id': other['id']}
        self.assertEqual(compute([f, other], [event]), [], 'ruled-out pair must not reappear')

    def test_matching_runtime_small_batch(self):
        records = [found(f'Person {i} Unique', gender='male', age_band='19–59', village='Madurai') for i in range(40)]
        records += [seeking(f'Person {i} Unique', gender='male', age_band='19–59', village='Madurai') for i in range(40)]
        start = time.perf_counter()
        suggestions = compute(records, [])
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        print(f'\nPART5_PERFORMANCE records=80 candidate_pairs=1600 suggestions={len(suggestions)} elapsed_ms={elapsed}')
        self.assertIsInstance(suggestions, list)


if __name__ == '__main__':
    unittest.main()
