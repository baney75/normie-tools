// Tests read repo files with node:fs and node:path. @types/node is not a dependency,
// so these loose declarations stand in for it.
declare module "node:fs" {
  const fs: any;
  export default fs;
}
declare module "node:path" {
  const path: any;
  export default path;
}
declare const __dirname: string;
