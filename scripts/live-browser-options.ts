// Preserve the managed session transport. Playwright does not automatically
// apply Node's --use-env-proxy to Chromium. Credentials are separate fields,
// never embedded in Chromium's --proxy-server command-line argument.
export function liveBrowserOptions(env: NodeJS.ProcessEnv = process.env) {
  const address = env.HTTPS_PROXY || env.HTTP_PROXY;
  const proxy = address ? new URL(address) : undefined;
  return {
    executablePath:
      env.CHROMIUM_PATH === ""
        ? undefined
        : (env.CHROMIUM_PATH ?? "/usr/bin/chromium"),
    args: ["--no-sandbox"],
    ...(proxy
      ? {
          proxy: {
            server: `${proxy.protocol}//${proxy.host}`,
            username: decodeURIComponent(proxy.username),
            password: decodeURIComponent(proxy.password),
            bypass: env.NO_PROXY,
          },
        }
      : {}),
  };
}
