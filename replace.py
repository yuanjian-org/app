import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            if file == 'WhiteLabel.ts':
                continue
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()

            new_content = content

            # replace getWhiteLabel()
            new_content = re.sub(r'getWhiteLabel\(\)', 'whiteLabel', new_content)
            # replace import { getWhiteLabel } from ...
            new_content = re.sub(r'import\s+\{\s*getWhiteLabel\s*\}\s+from\s+["\']shared/getWhiteLabel["\'];?', 'import { whiteLabel } from "shared/WhiteLabel";', new_content)

            # replace useWhiteLabel()
            new_content = re.sub(r'useWhiteLabel\(\)', 'whiteLabel', new_content)

            # replace useWhiteLabel in imports from components/useStaticConfigs

            new_content = re.sub(r'import\s+\{\s*([^}]*?),\s*useWhiteLabel\s*\}\s+from\s+["\'](components/useStaticConfigs|\./useStaticConfigs)["\'];?', r'import { \1 } from "\2";\nimport { whiteLabel } from "shared/WhiteLabel";', new_content)
            new_content = re.sub(r'import\s+\{\s*useWhiteLabel\s*,\s*([^}]*?)\}\s+from\s+["\'](components/useStaticConfigs|\./useStaticConfigs)["\'];?', r'import { \1 } from "\2";\nimport { whiteLabel } from "shared/WhiteLabel";', new_content)
            new_content = re.sub(r'import\s+\{\s*useWhiteLabel\s*\}\s+from\s+["\'](components/useStaticConfigs|\./useStaticConfigs)["\'];?', r'import { whiteLabel } from "shared/WhiteLabel";', new_content)

            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
