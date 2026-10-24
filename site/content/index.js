// Every module's content, collected in one place.
import { MODULE_1, M1_LESSONS } from "./m1-lessons.js";
import { M1_TEMPLATES } from "./m1-templates.js";
import { MODULE_2, M2_LESSONS } from "./m2-lessons.js";
import { M2_TEMPLATES } from "./m2-templates.js";

export const MODULES = [
  MODULE_1,
  MODULE_2,
  { id: 3, title: "Loops", blurb: "Repeating work with while and for.", soon: true },
  { id: 4, title: "Lists", blurb: "Storing many values in one variable.", soon: true },
  { id: 5, title: "Functions", blurb: "Writing your own reusable actions.", soon: true },
  { id: 6, title: "Dictionaries", blurb: "Looking things up by name.", soon: true },
  { id: 7, title: "Files and errors", blurb: "Reading data and handling problems.", soon: true },
  { id: 8, title: "Real-world projects", blurb: "Cleaning data and building reports.", soon: true },
];
export const ALL_LESSONS = [...M1_LESSONS, ...M2_LESSONS];
export const ALL_TEMPLATES = [...M1_TEMPLATES, ...M2_TEMPLATES];
