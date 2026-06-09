"use client"

import { PhoneInputField } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { isAdminUserPhoneValid } from "@/lib/admin-user-phone"
import { cn } from "@/lib/utils"

type AdminUserPhoneFieldProps = {
  id: string
  value: string
  onChange: (phone: string) => void
  label: string
  hint?: string
  placeholder?: string
  searchPlaceholder?: string
  required?: boolean
  touched?: boolean
  errorMessage?: string | null
  disabled?: boolean
  className?: string
  onBlur?: () => void
}

export function AdminUserPhoneField({
  id,
  value,
  onChange,
  label,
  hint,
  placeholder,
  searchPlaceholder,
  required = true,
  touched = false,
  errorMessage = null,
  disabled,
  className,
  onBlur,
}: AdminUserPhoneFieldProps) {
  const empty = required && !value.trim()
  const invalidFormat = value.length > 0 && !isAdminUserPhoneValid(value)
  const showInvalid = touched && (empty || invalidFormat)

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div onBlur={onBlur}>
        <PhoneInputField
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          disabled={disabled}
          invalid={showInvalid}
          defaultCountry="cm"
        />
      </div>
      {hint && !errorMessage ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
