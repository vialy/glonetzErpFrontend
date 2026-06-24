export type PaymentGatewayId = "monero" | "tranzak" | "neero" | "none"

export interface StaffSettings {
  id: string
  activeGateway: PaymentGatewayId
  notificationEmails: string[]
  createdAt: string
  updatedAt: string
}

export interface UpdateStaffSettingsInput {
  activeGateway: PaymentGatewayId
  notificationEmails: string[]
}

export interface SettingsProvider {
  get(): Promise<StaffSettings>
  update(input: UpdateStaffSettingsInput): Promise<StaffSettings>
}
