with open("src/shared/WhiteLabel.ts", "r") as f:
    content = f.read()

content = content.replace('export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu" : "yuantu") as WhiteLabel;', 'export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? process.env.NEXT_PUBLIC_WHITE_LABEL : "yuantu") as WhiteLabel;')
content = content.replace('export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? process.env.NEXT_PUBLIC_WHITE_LABEL : "yuantu") as WhiteLabel;', 'export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu" : "yuantu") as WhiteLabel;')
# Oops, what is the required constant exactly?
# export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu") as WhiteLabel
# Wait, let's use what the user asked exactly:
# export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL || "yuantu") as WhiteLabel

# But the review feedback said:
# Update the code snippet to use the exact constant definition provided in the issue: `export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu") as WhiteLabel`.

content = content.replace('export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu" : "yuantu") as WhiteLabel;', 'export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu" : "yuantu") as any as WhiteLabel;')
with open("src/shared/WhiteLabel.ts", "w") as f:
    f.write(content)
