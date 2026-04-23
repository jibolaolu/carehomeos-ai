export interface DataStackConfig {
  databaseName: string
  redisEnabled: boolean
  objectLockEnabled: boolean
}

export const dataStackDefaults: DataStackConfig = {
  databaseName: "carehomeos",
  redisEnabled: true,
  objectLockEnabled: true,
}
