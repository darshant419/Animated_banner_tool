with open('src/components/Canvas/DesignCanvas.tsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'parts.push' in line and 'transform' in line:
        lines[i] = '            parts.push(\'transform: \' + transformStr + \';\');\n'
with open('src/components/Canvas/DesignCanvas.tsx', 'w') as f:
    f.writelines(lines)
print('Fixed')
