import os
import re

files_to_fix = [
    'src/api/database/models/MeetingSlot.ts',
    'src/api/jinshuju.ts',
    'src/api/routes/saveSummary.test.ts',
    'src/components/useStaticConfigs.ts'
]

for path in files_to_fix:
    with open(path, 'r') as f:
        content = f.read()

    new_content = content
    if 'useStaticConfigs' in path:
        new_content = re.sub(r'import \{ WhiteLabel \} from "shared/WhiteLabel";\n?', '', new_content)
        new_content = re.sub(r'import \{ whiteLabel \} from "shared/WhiteLabel";\n?', '', new_content)
    else:
        new_content = re.sub(r'import \{ whiteLabel \} from "shared/WhiteLabel";\n?', '', new_content)

    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
