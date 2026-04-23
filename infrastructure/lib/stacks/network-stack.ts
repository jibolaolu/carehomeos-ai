export interface NetworkStackConfig {
  cidr: string
  availabilityZones: number
}

export const networkStackDefaults: NetworkStackConfig = {
  cidr: "10.42.0.0/16",
  availabilityZones: 2,
}
