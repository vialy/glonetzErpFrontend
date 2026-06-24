"use client"

import { isApiDataProvider } from "@/lib/data-provider"
import { httpStaffMembersProvider } from "@/domains/staff/providers/http"
import { mockStaffMembersProvider } from "@/domains/staff/providers/mock"
import type {
  CreateStaffMemberInput,
  ListStaffMembersQuery,
  StaffMember,
  UpdateStaffMemberInput,
} from "@/domains/staff/types"

const provider = isApiDataProvider() ? httpStaffMembersProvider : mockStaffMembersProvider

export const staffMembersService = {
  list(query?: ListStaffMembersQuery): Promise<StaffMember[]> {
    return provider.list(query)
  },

  get(id: string): Promise<StaffMember | null> {
    return provider.get(id)
  },

  create(input: CreateStaffMemberInput): Promise<StaffMember> {
    return provider.create(input)
  },

  update(id: string, input: UpdateStaffMemberInput): Promise<StaffMember | null> {
    return provider.update(id, input)
  },

  setActive(id: string, active: boolean): Promise<StaffMember | null> {
    return provider.setActive(id, active)
  },

  regeneratePassword(id: string): Promise<void> {
    return provider.regeneratePassword(id)
  },
}
