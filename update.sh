#!/bin/bash
# 1. Clean up unused files
rm -f /home/jules/verification/verify_projects.py
rm -rf /home/jules/verification/screenshots/
rm -rf /home/jules/verification/videos/
rm -f /home/jules/verification/login_page.html
rm -f /home/jules/verification/projects_page.html

# 2. Add feature flag
sed -i 's/menteeProfile: z.boolean().optional(),/menteeProfile: z.boolean().optional(),\n\n  projects: z.boolean().optional(),/g' src/shared/Features.ts
sed -i 's/features.menteeProfile = true;\n  }/features.menteeProfile = true;\n  }\n  if (process.env.ENABLE_PROJECTS === "true") {\n    features.projects = true;\n  }/g' src/api/getFeatures.ts
sed -i 's/icon: IoStar,\n    regex: \/^\/projects\//icon: IoStar,\n    regex: \/^\/projects\/,\n    feature: "projects"/g' src/components/Sidebar.tsx
