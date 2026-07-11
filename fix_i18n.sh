#!/bin/bash
FILES=(
  "src/pages/[userUrl].tsx"
  "src/pages/accounts/[userId].tsx"
  "src/pages/applicants/[applicantId].tsx"
  "src/pages/calibrations/[calibrationId].tsx"
  "src/pages/groups/[groupId].tsx"
  "src/pages/interviews/[interviewId].tsx"
  "src/pages/interviews/[interviewId]/feedback.tsx"
  "src/pages/mentees/[menteeId].tsx"
  "src/pages/mentorships/[mentorshipId]/assessments/[assessmentId].tsx"
  "src/pages/orgs/[orgId].tsx"
  "src/pages/preferences/[userId].tsx"
  "src/pages/profiles/[userId].tsx"
  "src/pages/projects/[id].tsx"
  "src/pages/projects/[id]/applications.tsx"
  "src/pages/projects/[id]/edit.tsx"
  "src/pages/projects/create.tsx"
  "src/pages/s/orgs/[orgId].tsx"
  "src/pages/s/projects/[id].tsx"
  "src/pages/users/[userId].tsx"
  "src/pages/deleted.tsx"
  "src/pages/form.tsx"
  "src/pages/match.tsx"
  "src/pages/resources.tsx"
  "src/pages/volunteers.tsx"
  "src/pages/s/mentors/index.tsx"
  "src/pages/s/projects/index.tsx"
  "src/pages/oauth2/profile.tsx"
  "src/pages/study/comms.tsx"
  "src/pages/study/handbook.tsx"
  "src/pages/study/interview.tsx"
)

# First, revert the previous bad changes
for file in "${FILES[@]}"; do
  git checkout "$file"
done

for file in "${FILES[@]}"; do
  # Determine if it's a static page (no path parameters in filename, meaning it could be SSG)
  # or if we should just use getI18nProps
  if ! grep -q "getI18nProps" "$file"; then
    # Add import at the top (after the last import)
    # Using awk to insert after the last import line
    awk '/^import/ {last=NR} {lines[NR]=$0} END {for(i=1;i<=NR;i++) {print lines[i]; if(i==last) print "import getI18nProps from \"components/getI18nProps\";"}}' "$file" > temp.tsx
    mv temp.tsx "$file"

    # If the file path has brackets, it is dynamic and lacks getStaticPaths (based on my previous check),
    # so we should use getServerSideProps. Otherwise getStaticProps.
    if [[ "$file" == *"["* ]]; then
      echo -e "\nexport const getServerSideProps = getI18nProps;" >> "$file"
    else
      echo -e "\nexport const getStaticProps = getI18nProps;" >> "$file"
    fi
  fi
done
