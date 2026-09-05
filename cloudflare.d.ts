declare module "cloudflare:workers" {
  export const env: { DB: import("./worker/private-api").PrivateEnv["DB"] };
}
