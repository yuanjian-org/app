with open("src/shared/WhiteLabel.ts", "r") as f:
    content = f.read()

import re
content = re.sub(r'export const whiteLabel = .*', 'export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu") as WhiteLabel', content)

with open("src/shared/WhiteLabel.ts", "w") as f:
    f.write(content)
