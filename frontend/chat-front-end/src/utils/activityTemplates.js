// utils/activityTemplates.js

const templates = {
  minor_renovation: [
    { name: "Site Prep & Demolition", description: "Clear the site and perform necessary demolition.", durationDays: 7 },
    { name: "Rough-In & Drywall", description: "Electrical/Plumbing rough-ins and drywall installation.", durationDays: 7 },
    { name: "Painting & Finishes", description: "Apply paint and install final finishes.", durationDays: 8 },
    { name: "Final Inspection & Handover", description: "Final walkthrough and project handover.", durationDays: 8 }
  ],
  standard_renovation: [
    { name: "Design Finalization & Permitting", description: "Finalize designs and secure necessary permits.", durationDays: 15 },
    { name: "Site Prep & Demolition", description: "Site preparation and structural demolition.", durationDays: 15 },
    { name: "MEP Rough-ins", description: "Mechanical, Electrical, and Plumbing rough-ins.", durationDays: 20 },
    { name: "Drywall & Flooring", description: "Install drywall and primary flooring.", durationDays: 20 },
    { name: "Fixtures, Finishes, & Handover", description: "Install fixtures, apply finishes, and final handover.", durationDays: 20 }
  ],
  new_building: [
    { name: "Site Preparation & Foundation", description: "Clear site, excavate, and lay foundation.", durationDays: 30 },
    { name: "Framing & Roofing", description: "Erect structural framing and complete roofing.", durationDays: 30 },
    { name: "MEP Rough-ins & Inspections", description: "Install HVAC, electrical, and plumbing rough-ins.", durationDays: 30 },
    { name: "Insulation & Drywall", description: "Install insulation and complete drywall.", durationDays: 30 },
    { name: "Interior Finishes & Trim", description: "Install cabinetry, trim, and interior finishes.", durationDays: 30 },
    { name: "Final Walkthrough & Handover", description: "Final inspections, punch list, and handover.", durationDays: 30 }
  ],
  large_scale: [
    { name: "Site Prep & Deep Foundation", description: "Entitlements, site clearing, and deep foundation work.", durationDays: 60 },
    { name: "Substructure & Superstructure", description: "Steel and concrete structural work.", durationDays: 60 },
    { name: "Building Envelope & Roofing", description: "Complete the exterior envelope and roof.", durationDays: 60 },
    { name: "Extensive MEP Installation", description: "Complex mechanical, electrical, and plumbing systems.", durationDays: 60 },
    { name: "Interior Build-out & Finishes", description: "Detailed interior construction and finishes.", durationDays: 60 },
    { name: "Commissioning & Landscaping", description: "System commissioning, exterior landscaping, and handover.", durationDays: 60 }
  ]
};

export const generateActivities = (preset, startDateStr) => {
  if (!templates[preset] || !startDateStr) return [];

  let currentDate = new Date(startDateStr);
  const activities = [];

  templates[preset].forEach(phase => {
    const actStart = new Date(currentDate);
    const actDue = new Date(currentDate);
    actDue.setDate(actDue.getDate() + phase.durationDays);

    activities.push({
      name: phase.name,
      description: phase.description,
      startDate: actStart.toISOString().split('T')[0],
      dueDate: actDue.toISOString().split('T')[0],
      status: "pending"
    });

    currentDate = new Date(actDue);
    currentDate.setDate(currentDate.getDate() + 1);
  });

  return activities;
};
