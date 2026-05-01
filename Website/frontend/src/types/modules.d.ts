// Allow TypeScript imports for CSS modules and SVG assets.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
