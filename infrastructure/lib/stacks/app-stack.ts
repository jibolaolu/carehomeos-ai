export interface AppStackConfig {
  serviceName: string
  imageUri: string
  desiredCount: number
}

export const appStackDefaults: AppStackConfig = {
  serviceName: "carehomeos-api",
  imageUri: "local/carehomeos-api:latest",
  desiredCount: 2,
}
