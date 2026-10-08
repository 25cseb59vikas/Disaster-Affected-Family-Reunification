"""All matching weights and thresholds. Points add up to a 0–100 score."""

WEIGHTS = {
    # Name similarity on normalised names, scaled by how rare the name is in the data.
    "name_max": 40,
    "name_conflict": -15,      # both names known and clearly different
    "name_partial": -8,        # names only partly alike
    # Relatives: found person's relative is the one searching, or is named on both records.
    "relative_max": 25,
    "relative_initial": 10,    # "M. Lakshmi" and the father's name starts with M
    "relative_in_name": 18,    # "Natarajan Balu" where the other record's father is Balu
    "relative_conflict": -10,  # same relation (e.g. father) recorded on both sides, different names
    "village": 12,
    "village_conflict": -5,
    "found_where_village": 8,  # found near the family's own village
    "clothing_max": 15,        # keyword overlap in clothing and marks
    "marks_bonus": 12,         # a shared scar, mole, tattoo...
    "age_same": 5,
    "gender_same": 3,          # only counted for nameless records, where it is part of the description
}

NAME_SIM_FLOOR = 0.70      # name similarity below this earns no points
NAME_CONFLICT_SIM = 0.50   # below this the names count as different
NAME_RARITY_FLOOR = 0.40   # most common name keeps at least this share of the name points
RELATIVE_SIM_MIN = 0.80
VILLAGE_SIM_MIN = 85       # rapidfuzz ratio, 0–100
VILLAGE_CONFLICT_SIM = 60

# Nameless found records: score over the evidence that exists, but ask for more of it.
NAMELESS_MIN_CLUES = 2     # agreeing clues besides gender and age: location, clothing/marks, relative, village

STRONG = 80
POSSIBLE = 50
AMBIGUOUS_GAP = 5
