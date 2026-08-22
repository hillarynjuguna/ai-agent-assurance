import re

# Read raw bytes and detect the issue
with open('landing.html', 'rb') as f:
    raw = f.read()

print('Total size bytes:', len(raw))

# Try UTF-8 decode
try:
    text = raw.decode('utf-8')
    print('Decoded as UTF-8 OK')
    print('Contains mojibake (â€)?', 'â€' in text)
    print('Count of â€":', text.count('â€"'))
    print('Count of â€™:', text.count('â€™'))
except Exception as e:
    print('UTF-8 decode failed:', e)
    text = raw.decode('latin-1')
    print('Decoded as Latin-1')

# Now fix: replace all mojibake with proper HTML entities
# The mojibake happens when UTF-8 bytes are read as latin-1
# We'll just decode as latin-1 then encode as utf-8 if needed
# But first let's check what we have

# The safest fix for Gumroad: use only ASCII + HTML entities
replacements = [
    # Curly quotes (UTF-8 decoded correctly but Gumroad may mis-render)
    ('\u2014', '&mdash;'),       # em dash —
    ('\u2013', '&ndash;'),       # en dash –
    ('\u2018', '&#39;'),         # left single quote '
    ('\u2019', '&#39;'),         # right single quote '
    ('\u201c', '&quot;'),        # left double quote "
    ('\u201d', '&quot;'),        # right double quote "
    ('\u2026', '&hellip;'),      # ellipsis …
    ('\u00a0', ' '),             # non-breaking space
    # Mojibake versions (if file was saved as latin-1)
    ('â€"', '&mdash;'),
    ('â€™', '&#39;'),
    ('â€œ', '&quot;'),
    ('â€\x9d', '&quot;'),
    ('â€¦', '&hellip;'),
    ('â€"', '&mdash;'),
    ('Â ', ' '),
    ('Â·', '&middot;'),
]

fixed = text
for bad, good in replacements:
    count = fixed.count(bad)
    if count:
        print(f'Replacing {repr(bad)} x{count} -> {good}')
    fixed = fixed.replace(bad, good)

with open('landing.html', 'w', encoding='utf-8', errors='replace') as f:
    f.write(fixed)

print(f'\nFixed landing.html written ({len(fixed.encode("utf-8"))} bytes)')

# Verify
with open('landing.html', 'rb') as f:
    check = f.read().decode('utf-8')
print('Remaining mojibake count:', check.count('â€'))
print('em-dash entities:', check.count('&mdash;'))
