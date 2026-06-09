const fs = require('fs');
const file = 'frontend/chat-front-end/src/pages/ProjectDetails.jsx';
let content = fs.readFileSync(file, 'utf8');

// Move ActivitiesCard up. Currently it's after ProjectProgress.
// Let's replace the whole grid section. First we view it to be safe.
// Wait, I can just use a regex to remove EmployeesCard completely.
content = content.replace(/import EmployeesCard from "\.\.\/components\/EmployeesCard";\n/, '');

// Remove EmployeesCard from the render
content = content.replace(/<EmployeesCard[\s\S]*?\/>\n/, '');

// To move ActivitiesCard above ProjectProgress, let's just re-arrange.
const activitiesCardMatch = content.match(/(<ActivitiesCard[\s\S]*?\/>)/);
const projectProgressMatch = content.match(/(<ProjectProgress[\s\S]*?\/>)/);

if (activitiesCardMatch && projectProgressMatch) {
  // Remove activities card from its current spot
  content = content.replace(activitiesCardMatch[0], '');
  // Insert it before ProjectProgress
  content = content.replace(projectProgressMatch[0], activitiesCardMatch[0] + '\n\n            ' + projectProgressMatch[0]);
}

fs.writeFileSync(file, content);
console.log('ProjectDetails layout fixed');
