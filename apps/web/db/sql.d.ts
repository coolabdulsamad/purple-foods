// esbuild bundles db/migrations/*.sql as plain strings (--loader:.sql=text);
// this declaration teaches TypeScript the same.
declare module "*.sql" {
  const content: string;
  export default content;
}
