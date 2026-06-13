// backend/src/utils/activityPresets.js

/**
 * Standard phases of a construction project and their proportional duration.
 * The 'durationPct' represents the percentage of the total project time
 * that the specific phase should roughly take.
 */
const standardPhases = [
  { name: "Pre-construction & Permits", description: "Securing permits, site prep, and planning", durationPct: 10 },
  { name: "Foundation & Excavation", description: "Site excavation, pouring footings and foundation", durationPct: 15 },
  { name: "Framing & Superstructure", description: "Erecting the main structural frame", durationPct: 20 },
  { name: "Exterior & Roof", description: "Roofing, windows, and exterior siding", durationPct: 15 },
  { name: "MEP Rough-in", description: "Mechanical, Electrical, and Plumbing rough-ins", durationPct: 15 },
  { name: "Interior Finishes", description: "Drywall, flooring, painting, and cabinets", durationPct: 15 },
  { name: "Final Fixtures & Handover", description: "Installing final fixtures, snagging, and final inspection", durationPct: 10 }
];

/**
 * Generates an array of activity objects with calculated start and due dates.
 * 
 * @param {Date} projectStartDate 
 * @param {Date} projectTargetDeadline 
 * @returns {Array} Array of activity objects
 */
export const generatePresetActivities = (projectStartDate, projectTargetDeadline) => {
  const start = new Date(projectStartDate).getTime();
  const end = new Date(projectTargetDeadline).getTime();
  const totalDurationMs = end - start;

  if (totalDurationMs <= 0) return [];

  let currentStartTimeMs = start;
  const generatedActivities = [];

  for (const phase of standardPhases) {
    const phaseDurationMs = totalDurationMs * (phase.durationPct / 100);
    const phaseEndTimeMs = currentStartTimeMs + phaseDurationMs;

    generatedActivities.push({
      name: phase.name,
      description: phase.description,
      startDate: new Date(currentStartTimeMs),
      dueDate: new Date(phaseEndTimeMs),
      status: "pending"
    });

    // The next phase starts when the current one ends
    currentStartTimeMs = phaseEndTimeMs;
  }

  // Ensure the last activity ends exactly on the target deadline to avoid rounding issues
  if (generatedActivities.length > 0) {
    generatedActivities[generatedActivities.length - 1].dueDate = new Date(end);
  }

  return generatedActivities;
};
