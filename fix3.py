with open("src/shared/WhiteLabel.ts", "r") as f:
    content = f.read()

content = content.replace("export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? \"yuantu\") as WhiteLabel;", "export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? process.env.NEXT_PUBLIC_WHITE_LABEL : \"yuantu\") as WhiteLabel;")

with open("src/shared/WhiteLabel.ts", "w") as f:
    f.write(content)
