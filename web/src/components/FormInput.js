'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function FormInput({
  label,
  type = 'text',
  placeholder,
  error,
  success,
  icon: Icon,
  helperText,
  required,
  disabled,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const getBorderColor = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-100'
    if (success) return 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100'
    if (focused) return 'border-outline-strong focus:border-brand focus:ring-emerald-100'
    return 'border-outline focus:border-brand focus:ring-emerald-100'
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-ink-secondary">
          {label}
          {required && <span className="ml-1 text-error">*</span>}
        </label>
      )}

      <div
        className={`relative ${
          Icon
            ? '[&:has(>input:not(:placeholder-shown))_.trail-slot-icon]:hidden'
            : ''
        } ${
          isPassword || error || success
            ? '[&:has(>input:not(:placeholder-shown))>input]:pr-10'
            : '[&:has(>input:not(:placeholder-shown))>input]:pr-4'
        }`}
      >
        <input
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full rounded-lg border px-4 py-2.5 text-sm leading-normal
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            placeholder:text-gray-500/90 placeholder:leading-normal
            ${
              Icon && (isPassword || error || success)
                ? 'pr-14'
                : Icon
                  ? 'pr-11'
                  : isPassword || error || success
                    ? 'pr-10'
                    : 'pr-4'
            }
            ${getBorderColor()}
            ${className}
          `}
          {...props}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {Icon && (
            <span
              className={`trail-slot-icon pointer-events-none flex h-9 w-9 items-center justify-center ${
                error ? 'text-red-400' : 'text-gray-400'
              }`}
              aria-hidden
            >
              <Icon className="h-4 w-4 shrink-0" />
            </span>
          )}

          {isPassword && !disabled && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 transition hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          {error && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          {success && !error && <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />}
        </div>
      </div>

      {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}
