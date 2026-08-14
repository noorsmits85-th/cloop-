import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Fix @@map(name) to @@map("name")
content = re.sub(r'@@map\(([a-zA-Z_]+)\)', r'@@map("\1")', content)

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
