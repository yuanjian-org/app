import re
import glob

def find_chinese_strings(content):
    # Match Chinese characters, optionally mixed with some punctuation/letters
    # Just grab anything with at least one Chinese character surrounded by quotes
    matches = re.findall(r'"([^"]*[\u4e00-\u9fa5]+[^"]*)"', content)
    matches.extend(re.findall(r"'([^']*[\u4e00-\u9fa5]+[^']*)'", content))
    return matches

files = glob.glob('src/shared/**/*.ts', recursive=True)

all_strings = set()
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        strings = find_chinese_strings(content)
        all_strings.update(strings)

zh_content = 'const zh = {\n  welcome: "欢迎",\n'
en_content = 'const en = {\n  welcome: "Welcome",\n'

for s in sorted(all_strings):
    key = s.replace(' ', '_').replace('.', '_')
    if len(key) > 50:
        key = key[:50]
    # some basic cleanup for key
    key = re.sub(r'[^a-zA-Z0-9_]', '_', key)
    # We will just use the chinese string as the key in the dictionary for simplicity.
    # A robust system might use english keys, but generating english translations
    # for all these strings is too complex and out of scope without an API.
    # Instead, we will use the string itself as the key if we are doing a quick hack,
    # OR we can just map the chinese string to itself in the zh dict, and an empty string or the chinese string in the en dict.
    pass

# Wait, the comment said: "add all existing Chinese text strings into the dictionaries"
# I should just extract them and put them in `zh.ts` and `en.ts`.
# Let's generate a dictionary where the key is the chinese string itself.

# ... actually, we can just use the exact string as key
print("Found", len(all_strings), "strings.")

with open('src/shared/i18n/locales/zh.ts', 'r', encoding='utf-8') as file:
    zh_current = file.read()

zh_dict = {}
for s in sorted(all_strings):
    # Escape quotes
    safe_s = s.replace('"', '\\"').replace('\n', '\\n')
    zh_dict[s] = safe_s

zh_out = "const zh: Record<string, string> = {\n  welcome: \"欢迎\",\n"
en_out = "const en: Record<string, string> = {\n  welcome: \"Welcome\",\n"

for k, v in zh_dict.items():
    safe_k = k.replace('"', '\\"').replace('\n', '\\n')
    zh_out += f'  "{safe_k}": "{v}",\n'
    en_out += f'  "{safe_k}": "{v}",\n' # Put Chinese in English for now since we don't have translations

zh_out += "};\n\nexport default zh;\n"
en_out += "};\n\nexport default en;\n"

with open('src/shared/i18n/locales/zh.ts', 'w', encoding='utf-8') as file:
    file.write(zh_out)

with open('src/shared/i18n/locales/en.ts', 'w', encoding='utf-8') as file:
    file.write(en_out)

print("Updated dictionaries.")
