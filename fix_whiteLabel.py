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

            # replace const whiteLabel = whiteLabel; with nothing
            new_content = re.sub(r'const\s+whiteLabel\s*=\s*whiteLabel;?\n?', '', new_content)
            # replace const isDemo = whiteLabel === "demo";

            # if whiteLabel is used, make sure it's imported
            if 'whiteLabel' in new_content and 'import { whiteLabel }' not in new_content:
                # Add import { whiteLabel } from "shared/WhiteLabel";
                # right below the first import or at the top
                if 'import ' in new_content:
                    new_content = re.sub(r'(import .*;\n)', r'\1import { whiteLabel } from "shared/WhiteLabel";\n', new_content, count=1)
                else:
                    new_content = 'import { whiteLabel } from "shared/WhiteLabel";\n' + new_content

            # clean up multiple imports of whiteLabel
            count = len(re.findall(r'import \{ whiteLabel \} from "shared/WhiteLabel";', new_content))
            if count > 1:
                # remove all but the first
                first_pos = new_content.find('import { whiteLabel } from "shared/WhiteLabel";')
                new_content = new_content[:first_pos+47] + new_content[first_pos+47:].replace('import { whiteLabel } from "shared/WhiteLabel";\n', '')
                new_content = new_content.replace('import { whiteLabel } from "shared/WhiteLabel";', '')
                # add back the first one
                new_content = new_content[:first_pos] + 'import { whiteLabel } from "shared/WhiteLabel";' + new_content[first_pos+47:]

            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
