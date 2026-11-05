import path from "node:path";
import { fileURLToPath } from "node:url";

// The site package is an ES module, so __dirname does not exist. Use these instead.
const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of a screenshot in <repo>/shots. */
export const shotPath = (name: string): string => path.join(here, "../../shots", name);

/** Absolute path of a file in site/public. */
export const publicPath = (name: string): string => path.join(here, "../public", name);
