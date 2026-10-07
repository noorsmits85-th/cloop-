with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Product model: remove supportTickets from Product
content = content.replace("model Product {\n", "model Product {\n")
# Find and remove supportTickets inside model Product
import re

# Remove supportTickets from Product
product_pattern = r"(model Product \{[\s\S]*?)(\s+supportTickets\s+SupportTicket\[\]\r?\n)([\s\S]*?@@map\(\"products\"\))"
content = re.sub(product_pattern, r"\1\3", content)

# Now ensure supportTickets is in User model
user_pattern = r"(model User \{[\s\S]*?favorites\s+ProductFavorite\[\]\r?\n)([\s\S]*?model Product)"
def add_to_user(m):
    user_part = m.group(1)
    if "supportTickets" not in user_part:
        user_part = user_part.rstrip() + "\n  supportTickets  SupportTicket[]\n"
    return user_part + "\n" + m.group(2)

content = re.sub(user_pattern, add_to_user, content)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleaned up Product and ensured User has supportTickets')
