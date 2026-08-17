lines = open('client/src/components/TopBar.tsx.backup', 'r').readlines()
# line numbers are 1-indexed in the backup, but list is 0-indexed
# We want to replace lines 111 to 124 (inclusive) because line 111 is index 110, line 124 is index 123.
# Actually, let's look: the button starts at line 111 and ends at line 124? Let's count:
# 111:              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-gray-100">
# 112:                <Avatar className="h-10 w-10">
# 113:                  <AvatarFallback className="bg-[#3FA9D4] text-white">
# 114:                    <Avatar className="h-10 w-10">
# 115:                  {user?.photo ? (
# 116:                    <AvatarImage src={user.photo} />
# 117:                  ) : (
# 118:                    <AvatarFallback className="bg-[#3FA9D4] text-white">
# 119:                      {user?.name?.charAt(0).toUpperCase() || 'U'}
# 120:                    </AvatarFallback>
# 121:                  )}
# 122:                </Avatar>
# 123:                  </AvatarFallback>
# 124:                </Avatar>
# 125:              </Button>
# So we want to replace from line 111 to line 125 (inclusive) -> indices 110 to 124.
new_lines = lines[:110]  # up to line 110 (exclusive)
new_lines.extend([
    '              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-gray-100">\n',
    '                <Avatar className="h-10 w-10">\n',
    '                  {user?.photo ? (\n',
    '                    <AvatarImage src={user.photo} />\n',
    '                  ) : (\n',
    '                    <AvatarFallback className="bg-[#3FA9D4] text-white">\n',
    '                      {user?.name?.charAt(0).toUpperCase() || \'U\'}\n',
    '                    </AvatarFallback>\n',
    '                  )}\n',
    '                </Avatar>\n',
    '              </Button>\n'
])
# Now we need to append the rest of the file after line 125 (index 125)
new_lines.extend(lines[125:])  # from line 126 (index 125) onwards
open('client/src/components/TopBar.tsx', 'w').writelines(new_lines)
print('Fixed TopBar.tsx')
