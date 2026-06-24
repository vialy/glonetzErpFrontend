export function isApiDataProvider() {
  return (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"
}
