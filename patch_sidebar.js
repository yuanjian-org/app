const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const replacement = `  {
    name: "入驻机构",
    action: "/orgs/manage",
    roles: "OrgAdmin",
  },
  {
    name: "全局设置",
    action: "/global",
    roles: "MentorshipManager",
  },
];`;

content = content.replace(`  {
    name: "全局设置",
    action: "/global",
    roles: "MentorshipManager",
  },
  {
    name: "入驻机构",
    action: "/orgs/manage",
    roles: "OrgAdmin",
  },
];`, replacement);

fs.writeFileSync('src/components/Sidebar.tsx', content);
